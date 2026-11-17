"""Descarga y prepara los sonidos reales (grabados) que usan los videos AGA. Uso: python3 fetch_sfx.py
 - Mixkit (https://mixkit.co/license/#sfxFree): licencia gratuita, uso comercial en video, sin atribución.
 - Kenney (CC0, https://kenney.nl): dominio público, mediante OpenGameArt.
Cada sonido se convierte a WAV mono 44,1 kHz, se recorta el silencio inicial y se normaliza el pico a -1 dB.
Los nombres a la izquierda son los "roles" que usa gen_audio.py."""
import os, subprocess, tempfile, urllib.request, zipfile, wave, struct, array, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'sfx'); os.makedirs(OUT, exist_ok=True)
MIX = 'https://assets.mixkit.co/active_storage/sfx/%d/%d-preview.mp3'
MIXKIT = {   # rol: (id de Mixkit, título original)
    'title_whoosh': (3005, 'Explainer video pops whoosh light pop'),
    'sweep_short': (175, 'Short transition sweep'),
    'tr_wipe': (3115, 'Fast transitions swoosh'),
    'tr_wipe2': (1490, 'Fast whoosh transition'),
    'tr_bars': (3120, 'Technology transition slide'),
    'tr_iris': (2634, 'Futuristic transition sweep'),
    'paper_move': (2380, 'Paper quick movement'),
    'paper_slide': (1530, 'Paper slide'),
    'page_turn': (1104, 'Page turn single'),
    'key': (2533, 'Single key type'),
    'mouse_clicks': (2997, 'Clear mouse clicks'),
    'atm_key': (2841, 'Atm cash machine key press'),
    'calc': (3122, 'Technology computer calculations'),
    'check': (1120, 'Modern click box check'),
    'reward': (952, 'Correct answer reward'),
    'correct': (2870, 'Correct answer tone'),
    'marimba': (2820, 'Magic marimba'),
    'pop_long': (2358, 'Long pop'),
    'pop_bubble': (2357, 'Bubble pop up alert notification'),
    'negative': (2569, 'Negative tone interface tap'),
    'coins': (1993, 'Clinking coins'),
    'gold_coin': (1999, 'Gold coin prize'),
    'bell': (933, 'Bell notification'),
    'zoom_in': (2619, 'UI zoom out'),
    'tech_select': (3124, 'Modern technology select'),
    'tech_confirm': (2520, 'High tech bleep confirmation'),
}
KEN_UI = 'https://opengameart.org/sites/default/files/kenney_interfaceSounds.zip'
KEN_CASINO = 'https://opengameart.org/sites/default/files/kenney_casino-audio.zip'
KENNEY = {   # rol: (zip, archivo)
    'card_place': (KEN_CASINO, 'Audio/card-place-1.ogg'), 'card_place2': (KEN_CASINO, 'Audio/card-place-3.ogg'),
    'card_slide': (KEN_CASINO, 'Audio/card-slide-2.ogg'), 'card_slide2': (KEN_CASINO, 'Audio/card-slide-5.ogg'),
    'chips_stack': (KEN_CASINO, 'Audio/chips-stack-2.ogg'), 'chips_stack2': (KEN_CASINO, 'Audio/chips-stack-5.ogg'),
    'chips_handle': (KEN_CASINO, 'Audio/chips-handle-3.ogg'), 'chip_lay': (KEN_CASINO, 'Audio/chip-lay-2.ogg'),
    'k_tick1': (KEN_UI, 'Audio/tick_001.ogg'), 'k_tick2': (KEN_UI, 'Audio/tick_002.ogg'), 'k_tick3': (KEN_UI, 'Audio/tick_004.ogg'),
    'k_confirm': (KEN_UI, 'Audio/confirmation_002.ogg'), 'k_confirm2': (KEN_UI, 'Audio/confirmation_004.ogg'),
    'k_pluck1': (KEN_UI, 'Audio/pluck_001.ogg'), 'k_pluck2': (KEN_UI, 'Audio/pluck_002.ogg'),
    'k_error': (KEN_UI, 'Audio/error_005.ogg'), 'k_select': (KEN_UI, 'Audio/select_002.ogg'),
    'k_open': (KEN_UI, 'Audio/open_001.ogg'), 'k_drop': (KEN_UI, 'Audio/drop_002.ogg'), 'k_glass': (KEN_UI, 'Audio/glass_003.ogg'),
    'k_toggle': (KEN_UI, 'Audio/toggle_001.ogg'), 'k_bong': (KEN_UI, 'Audio/bong_001.ogg'),
}

def get(url, dst):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=60) as r, open(dst, 'wb') as f: f.write(r.read())

def convert(src, role):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-ac', '1', '-ar', '44100', '-f', 's16le', '-'], capture_output=True, check=True).stdout
    a = array.array('h'); a.frombytes(raw)
    s = [v / 32768 for v in a]
    i = 0
    while i < len(s) - 1 and abs(s[i]) < .01: i += 1
    s = s[max(0, i - 40):]
    pk = max(abs(v) for v in s) or 1
    k = .89 / pk
    with wave.open(os.path.join(OUT, role + '.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(44100)
        w.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, v * k)) * 32767)) for v in s))

tmp = tempfile.mkdtemp()
for role, (i, title) in MIXKIT.items():
    p = os.path.join(tmp, role + '.mp3'); get(MIX % (i, i), p); convert(p, role); print('mixkit', role, title)
zips = {}
for role, (z, f) in KENNEY.items():
    if z not in zips:
        zp = os.path.join(tmp, os.path.basename(z)); get(z, zp); zips[z] = zipfile.ZipFile(zp)
    p = os.path.join(tmp, role + '.ogg'); open(p, 'wb').write(zips[z].read(f)); convert(p, role); print('kenney', role, f)
