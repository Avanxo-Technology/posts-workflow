"""Librería de sonido Pirotécnicos Favio Favio Domino (sintetizada con la librería estándar de Python, sin dependencias).
Paleta: chisporroteo, siseo de mecha, golpes de mortero (thump/bang), silbatos, tribuna, tortas (shell), cámara (obturador,
flash, láminas, motor de enfoque), campanitas (chime/ding), etc. Es la suma de los helpers de pirotecnia/december/postVideos
(video 1 al 5); si una función aparece repetida, la última definición es la vigente.

Uso en gen_audio.py (dentro de la carpeta del video):
    import sys, os
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '_shared'))
    import synth
    from synth import *
    synth.init(17.5, seed=11)            # duración total en segundos; la semilla fija el resultado
    thump(1.0, 90, .3, .9); whoosh(.8, .5, .4); sizzle(2, 3, .4, 2500, 6500, 'bell'); shell(5.0, .8)
    finish('sfx.wav')                    # normaliza, fundido final y escribe el wav estéreo
Los tiempos salen de index.html (cada escena/transición/golpe). SIN música: solo efectos.
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


def add(t0, samples, gain=1.0):
    i0 = int(t0 * SR)
    for k, v in enumerate(samples):
        i = i0 + k
        if 0 <= i < N:
            mix[i] += v * gain


def env_exp(n, tau):
    return [math.exp(-k / (tau * SR)) for k in range(n)]


def crackle(t0, dur, rate, gain=1.0):
    """chisporroteo de bengala: clics muy cortos de ruido brillante, a ritmo aleatorio"""
    t = t0
    while t < t0 + dur:
        t += rnd.expovariate(rate)
        n = int(SR * rnd.uniform(.0015, .007))
        a = rnd.uniform(.25, 1) ** 2
        prev = 0.0
        s = []
        for k in range(n):
            x = rnd.uniform(-1, 1)
            s.append((x - prev) * a * math.exp(-k / (n * .35)))  # derivada = realza agudos
            prev = x
        add(t, s, gain * .55)


def sizzle(t0, dur, gain=.5, f0=2500, f1=7000, shape='bell'):
    """siseo de mecha: ruido filtrado (pasa-banda barrido) con envolvente"""
    n = int(dur * SR)
    lp = bp = 0.0
    out = []
    for k in range(n):
        u = k / n
        f = f0 + (f1 - f0) * u
        c = 2 * math.sin(math.pi * f / SR)
        x = rnd.uniform(-1, 1)
        lp += c * bp
        hp = x - lp - .35 * bp
        bp += c * hp
        e = math.sin(math.pi * u) ** 1.5 if shape == 'bell' else (1 - u) ** 1.5
        out.append(bp * e)
    add(t0, out, gain * .6)


def thump(t0, f=95, dur=.28, gain=.9):
    n = int(dur * SR)
    ph = 0.0
    out = []
    for k in range(n):
        fr = f * (1 - .55 * k / n)
        ph += 2 * math.pi * fr / SR
        out.append(math.sin(ph) * math.exp(-k / (.09 * SR)))
    add(t0, out, gain)
    crackle(t0, .03, 600, .25)


def tick(t0, f=1400, gain=.35):
    n = int(.07 * SR)
    add(t0, [math.sin(2 * math.pi * f * k / SR) * math.exp(-k / (.012 * SR)) for k in range(n)], gain)


def pop(t0, gain=.5):
    n = int(.12 * SR)
    ph = 0.0
    out = []
    for k in range(n):
        ph += 2 * math.pi * (700 + 900 * k / n) / SR
        out.append(math.sin(ph) * math.exp(-k / (.03 * SR)))
    add(t0, out, gain)


def bang(t0, gain=.8, f=170):
    """detonación seca de cracker: golpe de ruido muy corto + cuerpo grave"""
    n = int(.09 * SR)
    out = [rnd.uniform(-1, 1) * math.exp(-k / (.012 * SR)) + .7 * math.sin(2 * math.pi * f * k / SR) * math.exp(-k / (.03 * SR)) for k in range(n)]
    add(t0, out, gain)


def bangs(t0, dur, rate, gain=.7):
    t = t0
    while t < t0 + dur:
        t += rnd.expovariate(rate)
        bang(t, gain * rnd.uniform(.4, 1), rnd.uniform(120, 260))


def whirr(t0, dur, gain=.5, spin=7.0):
    """zumbido de la rosita al girar: ruido en banda media con vibración al ritmo de la vuelta"""
    n = int(dur * SR)
    lp = bp = 0.0
    out = []
    for k in range(n):
        u = k / n
        c = 2 * math.sin(math.pi * (1800 + 1600 * u) / SR)
        x = rnd.uniform(-1, 1)
        lp += c * bp
        hp = x - lp - .4 * bp
        bp += c * hp
        am = (.55 + .45 * math.sin(2 * math.pi * spin * (1 + .5 * u) * k / SR)) * min(1, u * 8, (1 - u) * 6)
        out.append(bp * am)
    add(t0, out, gain * .55)


def whoosh(t0, dur=.5, gain=.45):
    sizzle(t0, dur, gain, 300, 3500, 'bell')


def chime(t0, f, gain=.3, dur=1.6):
    """campanita de cristal: parciales inarmónicos con caída exponencial"""
    n = int(dur * SR)
    out = [0.0] * n
    for mult, amp in ((1, 1), (2.01, .5), (2.76, .3), (5.4, .15)):
        for k in range(n):
            out[k] += amp * math.sin(2 * math.pi * f * mult * k / SR) * math.exp(-k / (dur * SR * .28 / mult ** .4))
    add(t0, out, gain)


def pad(t0, dur, freqs, gain=.06):
    n = int(dur * SR)
    out = []
    for k in range(n):
        u = k / n
        e = min(1, u * 8) * min(1, (1 - u) * 8)
        out.append(sum(math.sin(2 * math.pi * f * k / SR + 2 * math.sin(2 * math.pi * .2 * k / SR)) for f in freqs) * e / len(freqs))
    add(t0, out, gain)



def whistle(t0, dur=.55, gain=.35):
    """silbato de árbitro: tono agudo con vibración rápida (bolita)"""
    n = int(dur * SR)
    ph = 0.0
    out = []
    for k in range(n):
        u = k / n
        f = 2900 + 120 * math.sin(2 * math.pi * 32 * k / SR)
        ph += 2 * math.pi * f / SR
        am = (.6 + .4 * math.sin(2 * math.pi * 32 * k / SR)) * min(1, u * 30) * min(1, (1 - u) * 12)
        out.append((math.sin(ph) + .35 * math.sin(2 * ph)) * am)
    add(t0, out, gain)


def rising(t0, dur, f0, f1, gain=.25):
    """silbido de cohete que sube"""
    n = int(dur * SR)
    ph = 0.0
    out = []
    for k in range(n):
        u = k / n
        ph += 2 * math.pi * (f0 + (f1 - f0) * u * u) / SR
        out.append(math.sin(ph) * (.2 + .8 * u) * min(1, (1 - u) * 12))
    add(t0, out, gain)


def kick(t0, gain=.9):
    """patada al balón: golpe sordo + cuero"""
    thump(t0, 120, .18, gain)
    crackle(t0, .02, 800, .3)


def bounce(t0, gain=.45):
    n = int(.14 * SR)
    ph = 0.0
    out = []
    for k in range(n):
        ph += 2 * math.pi * (150 - 70 * k / n) / SR
        out.append(math.sin(ph) * math.exp(-k / (.04 * SR)))
    add(t0, out, gain)


def crowd(t0, dur, gain=.2, swell=None):
    """murmullo / rugido de tribuna: ruido en banda media con vaivén lento (swell = (inicio, pico, fin) en segundos relativos)"""
    n = int(dur * SR)
    lp1 = lp2 = 0.0
    out = []
    for k in range(n):
        u = k / n
        x = rnd.uniform(-1, 1)
        lp1 += .12 * (x - lp1)
        lp2 += .03 * (lp1 - lp2)
        band = lp1 - lp2
        wob = .75 + .25 * math.sin(2 * math.pi * (.9 + .3 * u) * k / SR + 1.7 * math.sin(2 * math.pi * .23 * k / SR))
        e = min(1, u * 6) * min(1, (1 - u) * 6)
        if swell:
            a, p, b = swell
            e *= .35 + .65 * (max(0, 1 - abs(u * dur - p) / (p - a if u * dur < p else b - p)) if a < b else 1)
        out.append(band * wob * e * 9)
    add(t0, out, gain)


def boom(t0, gain=1.0):
    thump(t0, 55, .7, gain)
    sizzle(t0, .5, .5, 2500, 400, 'decay')
    crackle(t0, .15, 500, .5)


def hum(t0, dur, gain=.2):
    n = int(dur * SR)
    add(t0, [(math.sin(2 * math.pi * 120 * k / SR) + .5 * math.sin(2 * math.pi * 240 * k / SR) + .3 * math.sin(2 * math.pi * 360 * k / SR)) * math.exp(-k / (dur * SR * .4)) for k in range(n)], gain)


C5, E5, G5, A5, C6, D6, E6, G6 = 523.25, 659.25, 783.99, 880.0, 1046.5, 1174.7, 1318.5, 1568.0


def rising(t0, dur, f0, f1, gain=.25):
    """silbido de cohete que sube"""
    n = int(dur * SR)
    ph = 0.0
    out = []
    for k in range(n):
        u = k / n
        ph += 2 * math.pi * (f0 + (f1 - f0) * u * u) / SR
        out.append(math.sin(ph) * (.2 + .8 * u) * min(1, (1 - u) * 12))
    add(t0, out, gain)


def boom(t0, gain=1.0):
    thump(t0, 55, .7, gain)
    sizzle(t0, .5, .5, 2500, 400, 'decay')
    crackle(t0, .15, 500, .5)


def hum(t0, dur, gain=.2):
    n = int(dur * SR)
    add(t0, [(math.sin(2 * math.pi * 120 * k / SR) + .5 * math.sin(2 * math.pi * 240 * k / SR) + .3 * math.sin(2 * math.pi * 360 * k / SR)) * math.exp(-k / (dur * SR * .4)) for k in range(n)], gain)



def rumble(t0, dur, gain=.5, f0=.04, f1=.2):
    """rugido grave de llamas: ruido filtrado que se abre"""
    n = int(dur * SR)
    lp = 0.0
    out = []
    for k in range(n):
        u = k / n
        x = rnd.uniform(-1, 1)
        lp += (f0 + (f1 - f0) * u) * (x - lp)
        out.append(lp * min(1, u * 6) * min(1, (1 - u) * 4) * 4)
    add(t0, out, gain)


def mo_delay(i):
    v = math.sin(i * 12.9898) * 43758.5453
    return (v - math.floor(v)) * .55


C5, E5, G5, A5, C6, D6, E6, G6 = 523.25, 659.25, 783.99, 880.0, 1046.5, 1174.7, 1318.5, 1568.0

def shell(tb, gain=.8):
    """cohete: silbido que sube + estallido + chisporroteo"""
    rising(tb - .4, .4, 500, 2300, .2)
    thump(tb, 75, .3, gain); bang(tb, .65, 170); crackle(tb, .6, 220, .55)


def scribble(t0, dur=.4, gain=.4):
    """lápiz que traza la palomita: ruido agudo con rasguños"""
    n = int(dur * SR)
    prev = 0.0
    out = []
    for k in range(n):
        u = k / n
        x = rnd.uniform(-1, 1)
        hp = x - prev
        prev = x
        am = (.5 + .5 * abs(math.sin(2 * math.pi * 23 * u))) * math.sin(math.pi * u) ** .7
        out.append(hp * am * .6)
    add(t0, out, gain)


def ding(t0, f=1568.0, gain=.35, dur=.9):
    """campanita limpia de 'listo'"""
    n = int(dur * SR)
    out = [(math.sin(2 * math.pi * f * k / SR) + .35 * math.sin(2 * math.pi * f * 2.76 * k / SR)) * math.exp(-k / (dur * SR * .22)) for k in range(n)]
    add(t0, out, gain)


def slap(t0, f=110, gain=.8):
    """tarjeta de color que cae sobre la mesa: golpe seco + chasquido"""
    thump(t0, f, .16, gain)
    n = int(.05 * SR)
    add(t0, [rnd.uniform(-1, 1) * math.exp(-k / (.008 * SR)) for k in range(n)], gain * .6)


def tock(t0, f=420, gain=.4):
    """toque de madera"""
    n = int(.1 * SR)
    add(t0, [(math.sin(2 * math.pi * f * k / SR) + .5 * math.sin(2 * math.pi * f * 2.3 * k / SR)) * math.exp(-k / (.018 * SR)) for k in range(n)], gain)


def ratchet(t0, dur, n_clicks, f0=1200, f1=2600, gain=.3):
    """contador mecánico: clics cada vez más rápidos y agudos"""
    for i in range(n_clicks):
        u = i / max(1, n_clicks - 1)
        tt = t0 + dur * (u ** .85)
        tick(tt, f0 + (f1 - f0) * u, gain)


def subkick(t0, gain=.9):
    n = int(.4 * SR)
    ph = 0.0
    out = []
    for k in range(n):
        ph += 2 * math.pi * (46 + 70 * math.exp(-k / (.04 * SR))) / SR
        out.append(math.sin(ph) * math.exp(-k / (.12 * SR)))
    add(t0, out, gain)


def stamp(t0, gain=1.0):
    """sello pesado: ka-chunk"""
    slap(t0, 150, gain * .7)
    thump(t0 + .07, 62, .45, gain)
    crackle(t0 + .07, .08, 700, .4)
    n = int(.25 * SR)
    add(t0 + .07, [math.sin(2 * math.pi * 640 * k / SR) * math.exp(-k / (.05 * SR)) * .2 for k in range(n)], gain)   # eco metálico


def saw_chord(t0, freqs, dur, gain=.25):
    n = int(dur * SR)
    out = []
    for k in range(n):
        u = k / n
        env = min(1, u * 40) * math.exp(-u * 2.2)
        s = 0.0
        for f in freqs:
            for h in (1, 2, 3):
                s += math.sin(2 * math.pi * f * h * k / SR) / h
        out.append(s * env / len(freqs))
    add(t0, out, gain)


def fanfare(t0, gain=.25):
    """¡tan-tan! de logro: acorde de metales sintéticos"""
    saw_chord(t0, (261.6, 329.6, 392.0), .18, gain)
    saw_chord(t0 + .2, (329.6, 415.3, 523.3), .9, gain * 1.1)


def doppler(t0, dur, f0, f1, gain=.4):
    """barrido de tono que pasa rápido"""
    n = int(dur * SR)
    ph = 0.0
    out = []
    for k in range(n):
        u = k / n
        ph += 2 * math.pi * (f0 + (f1 - f0) * u * u) / SR
        out.append((math.sin(ph) + rnd.uniform(-.25, .25)) * math.sin(math.pi * u) ** 1.2)
    add(t0, out, gain)


def whip(t0, gain=.6):
    """látigo: chasquido agudo"""
    n = int(.12 * SR)
    prev = 0.0
    out = []
    for k in range(n):
        x = rnd.uniform(-1, 1)
        out.append((x - prev) * math.exp(-k / (.018 * SR)))
        prev = x
    add(t0, out, gain)


def shell(tb, gain=.8):
    rising(tb - .4, .4, 500, 2300, .2)
    thump(tb, 75, .3, gain); bang(tb, .65, 170); crackle(tb, .6, 220, .55)


def beep(t0, f=2000.0, dur=.07, gain=.3):
    """bip electrónico de cámara"""
    n = int(dur * SR)
    add(t0, [math.sin(2 * math.pi * f * k / SR) * min(1, k / (.004 * SR)) * min(1, (n - k) / (.01 * SR)) for k in range(n)], gain)


def whine(t0, dur, f0, f1, gain=.18):
    """carga del flash: tono agudo que sube"""
    n = int(dur * SR)
    ph = 0.0
    out = []
    for k in range(n):
        u = k / n
        ph += 2 * math.pi * (f0 + (f1 - f0) * u * u) / SR
        out.append(math.sin(ph) * (.3 + .7 * u) * min(1, u * 20))
    add(t0, out, gain)


def shutter(t0, gain=.8):
    """obturador de cámara réflex: clac-clac mecánico"""
    n = int(.05 * SR)
    add(t0, [rnd.uniform(-1, 1) * math.exp(-k / (.006 * SR)) for k in range(n)], gain * .8)
    thump(t0, 190, .06, gain * .6)
    n2 = int(.04 * SR)
    add(t0 + .07, [rnd.uniform(-1, 1) * math.exp(-k / (.005 * SR)) for k in range(n2)], gain * .6)
    thump(t0 + .07, 140, .06, gain * .4)


def flash_pop(t0, gain=.5):
    """destello del flash: chasquido eléctrico + silbido que se apaga"""
    n = int(.25 * SR)
    prev = 0.0
    out = []
    for k in range(n):
        x = rnd.uniform(-1, 1)
        out.append((x - prev) * math.exp(-k / (.04 * SR)))
        prev = x
    add(t0, out, gain)
    whine(t0, .25, 7000, 3000, .08)


def motor(t0, dur, f0, f1, gain=.22):
    """motorcito del enfoque: zumbido áspero que sube y baja"""
    n = int(dur * SR)
    ph = 0.0
    out = []
    for k in range(n):
        u = k / n
        ph += 2 * math.pi * (f0 + (f1 - f0) * u) / SR
        saw = ((ph / (2 * math.pi)) % 1) * 2 - 1
        out.append((saw * .7 + rnd.uniform(-.2, .2)) * math.sin(math.pi * u) ** .5)
    add(t0, out, gain)


def blades(t0, dur, up=False, gain=.5):
    """láminas del diafragma que se cierran o se abren: whirr + trinquete"""
    n_cl = 14
    for i in range(n_cl):
        u = i / (n_cl - 1)
        tt = t0 + dur * (u if not up else u)
        tick(tt, (2800 - 1600 * u) if not up else (1200 + 1600 * u), gain * .5)
    sizzle(t0, dur, gain * .5, 3500 if not up else 800, 800 if not up else 3500, 'bell')


def rec_beep(t0):
    beep(t0, 1760, .07, .25); beep(t0 + .11, 880, .12, .25)


def shell(tb, gain=.8):
    rising(tb - .4, .4, 500, 2300, .2)
    thump(tb, 75, .3, gain); bang(tb, .65, 170); crackle(tb, .6, 220, .55)



def finish(path='sfx.wav', fade=.05):
    """normaliza el pico a .89, aplica fundido final (último `fade` del total) y escribe el wav estéreo"""
    for k in range(N):
        u = k / N
        if u > 1 - fade:
            mix[k] *= (1 - u) / fade
    peak = max(abs(v) for v in mix) or 1
    scale = .89 / peak
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(b''.join(struct.pack('<hh', *(2 * [int(max(-1, min(1, v * scale)) * 32767)])) for v in mix))
    print(path, 'listo, pico', round(peak, 2))
