"""Mezclador de efectos reales para los reels GREMCO de noviembre (ver fetch_sfx.py para origen y licencias).
    m = Mix(total); m.s('cam1', 3.0, .8); m.amb('amb_urban', 0, total, .2); m.clip('media/x.wav', 0, .5); m.finish('sfx.wav')
Los sonidos viven en _shared/sfx/<rol>.wav (mono, 44,1 kHz). Bus 'fx' (efectos), 'amb' (ambientes) y 'clip' (audio real de los videos);
ambientes y clips bajan solos cuando suena un efecto fuerte (ducking) y todo pasa por un limitador suave."""
import array, math, os, struct, wave
SR = 44100
HERE = os.path.dirname(os.path.abspath(__file__))
_cache = {}

def _read(path):
    with wave.open(path) as w:
        a = array.array('h'); a.frombytes(w.readframes(w.getnframes())); ch = w.getnchannels()
    return [v / 32768 for v in a[::ch]]

def load(role):
    if role not in _cache: _cache[role] = _read(os.path.join(HERE, 'sfx', role + '.wav'))
    return _cache[role]

def _resample(x, rate):
    if rate == 1.0: return x
    n = int(len(x) / rate); out = []
    for k in range(n):
        p = k * rate; i = int(p); f = p - i
        out.append(x[i] * (1 - f) + (x[i + 1] if i + 1 < len(x) else 0) * f)
    return out

class Mix:
    def __init__(self, total):
        self.total = total; self.N = int(SR * total)
        self.fx = [0.0] * self.N; self.amb_b = [0.0] * self.N; self.clips = [0.0] * self.N

    def _place(self, buf, t0, x, g):
        i0 = int(round(t0 * SR))
        for k, v in enumerate(x):
            i = i0 + k
            if i >= self.N: break
            if i >= 0: buf[i] += v * g

    def s(self, role, t, g=1.0, dur=None, rate=1.0, hit=False, start=0.0, fade=.05):
        """efecto `role` en el segundo t. dur recorta (con fundido); rate cambia velocidad y tono;
        hit=True alinea el golpe más fuerte del sonido con t; start: segundo del sonido donde empieza."""
        x = load(role)[int(start * SR):]
        x = _resample(x, rate)
        if dur is not None: x = x[:int(dur * SR)]
        f = min(int(fade * SR), len(x) // 2) or 1
        x = [v * min(1, (len(x) - k) / f) for k, v in enumerate(x)]
        if hit:
            pk = max(range(len(x)), key=lambda i: abs(x[i])); t -= pk / SR
        self._place(self.fx, t, x, g)

    def amb(self, role, t0, dur, g=.2, start=0.0, fade=1.0):
        """ambiente que se repite en bucle (con fundido cruzado) durante `dur` segundos"""
        src = load(role)[int(start * SR):]; n = int(dur * SR); out = []; cf = int(.8 * SR)
        while len(out) < n:
            seg = src[:]
            if out:
                for k in range(cf):
                    u = k / cf; out[-cf + k] = out[-cf + k] * (1 - u) + seg[k] * u
                seg = seg[cf:]
            out += seg
        out = out[:n]; f = int(fade * SR)
        out = [v * min(1, k / f, (n - k) / f) for k, v in enumerate(out)]
        self._place(self.amb_b, t0, out, g)

    def clip(self, path, t0, g=.5, fade=.2):
        """audio real del video (wav mono 44,1 kHz preparado por el generador)"""
        x = _read(os.path.join(os.getcwd(), path)); f = int(fade * SR)
        x = [v * min(1, k / f, (len(x) - k) / f) for k, v in enumerate(x)]
        self._place(self.clips, t0, x, g)

    def finish(self, path, peak=.89):
        N = self.N; env = 0.0; up = 1 - math.exp(-1 / (.004 * SR)); dn = 1 - math.exp(-1 / (.28 * SR))
        mix = [0.0] * N
        for i in range(N):
            x = abs(self.fx[i]); env += (up if x > env else dn) * (x - env)
            d = 1 - .45 * min(1, env * 3)
            mix[i] = self.fx[i] + (self.amb_b[i] + self.clips[i]) * d
        rms = math.sqrt(sum(v * v for v in mix) / N) or 1
        g0 = min(5.0, .17 / rms)          # sube el volumen general (~ -14 LUFS) y el limitador suave recorta solo los picos
        mix = [math.tanh(v * g0) for v in mix]
        pk = max(abs(v) for v in mix) or 1; sc = peak / pk; fo = int(.7 * SR)
        with wave.open(path, 'wb') as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
            buf = array.array('h')
            for k, v in enumerate(mix):
                g = sc * min(1, k / 150, max(0, (N - k) / fo)); s = int(max(-1, min(1, v * g)) * 32767); buf.append(s); buf.append(s)
            w.writeframes(buf.tobytes())
        print(os.path.basename(path), 'listo, pico', round(pk, 2))
