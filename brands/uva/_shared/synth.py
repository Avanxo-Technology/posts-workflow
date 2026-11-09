"""Librería de sonido BASE (punto de partida para marcas nuevas; copia de la de GMAQ) (sintetizada con la librería estándar de Python, sin grabaciones ni dependencias).
Paleta: cuerdas pulsadas (Karplus-Strong), bloque de madera, matraca de llave, freno de aire hidráulico,
caídas de bajo, golpes de bajo y colchón de sintetizador. Extraída de los gen_audio.py de gmaq/noviembre/postVideo1 y 2.

Uso en gen_audio.py (dentro de la carpeta del video):
    import sys, os
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '_shared'))
    from synth import *
    import synth
    synth.init(16.4, seed=515)          # duración total en segundos; la semilla fija el resultado
    pad(0, 8, (D3, A3, D4), .10)        # ... escenas con pluck/wood/ratchet/drop/airbrake/sweep/stab/arp/motor ...
    finish('sfx.wav')                   # normaliza, fundido final y escribe el wav
Los tiempos salen de index.html (cortes de escena y golpes). NOTA: usar `import synth` además de `from synth import *`
solo para llamar synth.init(); el resto de funciones se usan directo.
"""
import math, random, struct, wave

SR = 44100
TAU = 2 * math.pi
TOTAL = 0.0
N = 0
mix = []
rnd = random.Random(1)


def init(total, seed=1):
    """Arranca una mezcla nueva de `total` segundos (llamar una vez, al inicio de gen_audio.py)."""
    global TOTAL, N, mix, rnd
    TOTAL = total
    N = int(SR * total)
    mix = [0.0] * N
    rnd = random.Random(seed)


def put(t0, xs, g=1.0):
    i0 = int(t0 * SR)
    for k, v in enumerate(xs):
        i = i0 + k
        if 0 <= i < N:
            mix[i] += v * g


def lowpass(xs, fc):
    a = 1 - math.exp(-TAU * fc / SR)
    y = 0.0
    out = []
    for x in xs:
        y += a * (x - y)
        out.append(y)
    return out


def highpass(xs, fc):
    lp = lowpass(xs, fc)
    return [x - l for x, l in zip(xs, lp)]


def pluck(t0, f, g=.5, dur=1.2, bright=.5):
    """cuerda pulsada (Karplus-Strong): ráfaga de ruido que recircula por una línea de retardo con pérdida"""
    L = max(2, int(SR / f))
    buf = [rnd.uniform(-1, 1) * (1 - bright) + (rnd.uniform(-1, 1) if k % 2 else 0) * bright for k in range(L)]
    n = int(dur * SR)
    out = []
    decay = .996 - .0006 * (f / 400)
    i = 0
    for k in range(n):
        j = (i + 1) % L
        v = buf[i]
        buf[i] = decay * .5 * (buf[i] + buf[j])
        out.append(v)
        i = j
    fade = int(.03 * SR)
    for k in range(min(fade, n)):
        out[n - 1 - k] *= k / fade
    put(t0, out, g)


def arp(t0, notes, step=.07, g=.4, dur=.9):
    """arpegio rápido de cuerdas (subida de tensión / cierre)"""
    for i, f in enumerate(notes):
        pluck(t0 + i * step, f, g * (.75 + .25 * i / max(1, len(notes) - 1)), dur)


def wood(t0, g=.8, f=210):
    """bloque de madera: dos parciales muy cortos + golpecito de ruido"""
    n = int(.12 * SR)
    put(t0, [(math.sin(TAU * f * k / SR) + .6 * math.sin(TAU * f * 2.4 * k / SR)) * math.exp(-k / (.018 * SR)) for k in range(n)], g)
    m = int(.004 * SR)
    put(t0, [rnd.uniform(-1, 1) * (1 - k / m) for k in range(m)], g * .4)


def ratchet(t0, n=10, gap=.045, g=.4, f=2300, accel=.9):
    """matraca de llave: clics de ruido pasa-altos cada vez más seguidos"""
    t = t0
    for i in range(n):
        m = int(.006 * SR)
        click = highpass([rnd.uniform(-1, 1) * math.exp(-k / (m * .3)) for k in range(m)], f)
        put(t, click, g * (.6 + .4 * i / n))
        t += gap * (accel ** i)


def drop(t0, dur=.5, g=.9, f0=170, f1=32):
    """caída de bajo: seno que baja de f0 a f1 con saturación suave"""
    n = int(dur * SR)
    ph = 0.0
    out = []
    for k in range(n):
        u = k / n
        ph += TAU * (f1 + (f0 - f1) * (1 - u) ** 2.2) / SR
        out.append(math.tanh(2.2 * math.sin(ph)) * (1 - u) ** .8 * min(1, k / (.004 * SR)))
    put(t0, out, g)


def airbrake(t0, dur=.35, g=.5):
    """freno de aire hidráulico: 'pssh' de ruido agudo con ataque instantáneo"""
    n = int(dur * SR)
    x = highpass([rnd.uniform(-1, 1) for _ in range(n)], 2500)
    put(t0, [v * math.exp(-k / (n * .28)) for k, v in enumerate(x)], g)


def sweep(t0, dur=.6, g=.4, up=True):
    """barrido tonal con dos osciladores desafinados (para persianas / aro)"""
    n = int(dur * SR)
    p1 = p2 = 0.0
    out = []
    for k in range(n):
        u = k / n
        fr = 180 + 1500 * (u if up else 1 - u) ** 2
        p1 += TAU * fr / SR
        p2 += TAU * fr * 1.007 / SR
        out.append((math.sin(p1) + math.sin(p2)) * .5 * math.sin(math.pi * u) ** 1.2)
    put(t0, out, g)


def stab(t0, f=98, g=.6, dur=.5):
    """golpe de bajo sintético: diente de sierra con filtro que se cierra"""
    n = int(dur * SR)
    ph = 0.0
    out = []
    y = 0.0
    for k in range(n):
        ph += f / SR
        saw = 2 * (ph % 1) - 1
        fc = 120 + 1800 * math.exp(-k / (.07 * SR))
        a = 1 - math.exp(-TAU * fc / SR)
        y += a * (saw - y)
        out.append(y * math.exp(-k / (.22 * SR)))
    put(t0, out, g)


def pad(t0, dur, freqs, g=.12):
    """colchón de sintetizador: sierras desafinadas con filtro suave y entrada lenta"""
    n = int(dur * SR)
    out = [0.0] * n
    for f in freqs:
        for det in (.996, 1.004):
            ph = 0.0
            for k in range(n):
                ph += f * det / SR
                out[k] += 2 * (ph % 1) - 1
    out = lowpass(out, 700)
    sc = 1 / (len(freqs) * 2)
    put(t0, [v * sc * math.sin(math.pi * k / n) ** .8 for k, v in enumerate(out)], g)


def motor(t0, dur, g=.2, f=38):
    """zumbido de motor: dos senos graves con vibración lenta (muy suave, de fondo)"""
    n = int(dur * SR)
    put(t0, [(math.sin(TAU * f * k / SR) + .6 * math.sin(TAU * f * 2.01 * k / SR + math.sin(TAU * 3 * k / SR))) * (.7 + .3 * math.sin(TAU * 6 * k / SR)) * min(1, k / (.5 * SR)) * min(1, (n - k) / (.5 * SR)) for k in range(n)], g)


def finish(path='sfx.wav'):
    """normaliza, fundido final y escribe el wav estéreo"""
    for k in range(N):
        u = k / N
        if u > .95:
            mix[k] *= (1 - u) / .05
    peak = max(abs(v) for v in mix)
    scale = .89 / peak
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(b''.join(struct.pack('<hh', *(2 * [int(max(-1, min(1, v * scale)) * 32767)])) for v in mix))
    print(path, 'listo, pico', round(peak, 2))


# escala pentatónica menor de Re (grave a agudo) para que todas las cuerdas suenen "en tono"
D3, F3, G3, A3, C4 = 146.83, 174.61, 196.0, 220.0, 261.63
D4, F4, G4, A4, C5, D5, F5, G5, A5 = 293.66, 349.23, 392.0, 440.0, 523.25, 587.33, 698.46, 783.99, 880.0
