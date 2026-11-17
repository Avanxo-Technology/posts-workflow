"""Mezclador de sonidos reales (grabados, de licencia libre) para los videos AGA. Ver fetch_sfx.py para el origen y las licencias.
    m = Mix(total); m.s('check', 6.1, .8); ...; m.save('sfx_raw.wav'); finish(...) añade música con ducking y normaliza.
Los sonidos viven en _shared/sfx/<rol>.wav (mono, 44,1 kHz)."""
import os, wave, struct, array, subprocess

SR = 44100
HERE = os.path.dirname(os.path.abspath(__file__))
_cache = {}


def load(role):
    if role not in _cache:
        with wave.open(os.path.join(HERE, 'sfx', role + '.wav')) as w:
            a = array.array('h'); a.frombytes(w.readframes(w.getnframes()))
        _cache[role] = [v / 32768 for v in a]
    return _cache[role]


def peak_index(s):
    m = max(range(len(s)), key=lambda i: abs(s[i]))
    return m


class Mix:
    def __init__(self, total):
        self.total = total
        self.N = int(SR * total)
        self.b = [0.0] * self.N

    def s(self, role, t, g=1.0, dur=None, rate=1.0, fade=.03, hit=False, start=0.0):
        """pone el sonido `role` en el segundo t.
        dur: recorta a esa duración (con fundido final `fade`); rate: velocidad/tono (1.2 = más agudo y corto);
        hit=True alinea el golpe más fuerte del sonido con t (para impactos, palomitas y monedas);
        start: segundo del sonido donde empezar."""
        s = load(role)
        i0 = int(start * SR)
        s = s[i0:]
        if rate != 1.0:
            n = int(len(s) / rate); out = []
            for k in range(n):
                x = k * rate; i = int(x); f = x - i
                out.append(s[i] * (1 - f) + (s[i + 1] if i + 1 < len(s) else 0) * f)
            s = out
        if dur is not None:
            s = s[:int(dur * SR)]
        nf = min(len(s), int(fade * SR))
        off = (peak_index(s) / SR) if hit else 0.0
        base = int((t - off) * SR)
        b, N, L = self.b, self.N, len(s)
        for k in range(L):
            i = base + k
            if 0 <= i < N:
                e = 1.0
                if nf and k >= L - nf:
                    e = (L - k) / nf
                b[i] += s[k] * g * e

    def save(self, path):
        pk = max(abs(v) for v in self.b) or 1
        sc = .89 / pk if pk > .89 else 1.0
        with wave.open(path, 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, v * sc)) * 32767)) for v in self.b))


def finish(raw, music, out, total, music_db=-13, start=0.0, fade_out=2.0, lufs=-15):
    """música de fondo OPCIONAL (si `music` es None o no existe, solo se normalizan los efectos); con música: fundido de entrada y salida que se baja sola cuando suenan los efectos (sidechain) + normalización"""
    T = total
    if not music or not os.path.exists(music):   # sin música: solo efectos, normalizados
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', raw, '-af',
                        f"aformat=sample_fmts=fltp:channel_layouts=stereo,loudnorm=I={lufs}:TP=-1.5:LRA=9,atrim=duration={T}",
                        '-ar', '44100', '-ac', '2', out], check=True)
        return
    fc = (f"[0:a]atrim=start={start}:duration={T},asetpts=PTS-STARTPTS,volume={music_db}dB,afade=t=in:d=1.2,"
          f"afade=t=out:st={T - fade_out}:d={fade_out},aformat=sample_fmts=fltp:channel_layouts=stereo[m];"
          f"[1:a]aformat=sample_fmts=fltp:channel_layouts=stereo,asplit=2[sa][sb];"
          f"[m][sb]sidechaincompress=threshold=0.03:ratio=5:attack=12:release=350[md];"
          f"[sa][md]amix=inputs=2:normalize=0,loudnorm=I={lufs}:TP=-1.5:LRA=9,atrim=duration={T}[o]")
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', music, '-i', raw, '-filter_complex', fc, '-map', '[o]', '-ar', '44100', '-ac', '2', out], check=True)
