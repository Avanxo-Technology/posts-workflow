"""Descarga y prepara los efectos de sonido reales (grabados) de los reels GREMCO de noviembre. Uso: python3 fetch_sfx.py
Origen: Mixkit Sound Effects (https://mixkit.co/license/#sfxFree): licencia gratuita, uso comercial en video, sin atribución.
Cada sonido se convierte a WAV mono 44,1 kHz y se normaliza el pico a -1 dB. Los nombres de la izquierda son los "roles"
que usa sfxlib.py. Paleta documental/cinematográfica (obturadores de cámara, impactos, barridos de aire, aplausos),
distinta a la de los videos de pirotecnia (sintetizados) y AGA (interfaz, papel, casino)."""
import os, subprocess, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'sfx'); os.makedirs(OUT, exist_ok=True)
MIX = 'https://assets.mixkit.co/active_storage/sfx/%d/%d-preview.mp3'
SFX = {   # rol: (id de Mixkit, título original)
    'cam1': (1133, 'Camera shutter click'), 'cam2': (1430, 'Camera shutter hard click'),
    'cam3': (1438, 'Vintage camera shutter'), 'cam4': (1432, 'Camera digital shutter'),
    'cam_flash': (432, 'Reporters crowd and camera flashes'), 'cam_focus': (1436, 'Camera auto focus'),
    'hit_big': (788, 'Big cinematic impact'), 'hit_logo': (2900, 'Movie logo intro impact'),
    'hit_zoom': (772, 'Quick zoom impact'), 'hit_metal': (833, 'Metal hammer hit'),
    'hit_drum': (563, 'Drum deep impact'), 'hit_fast': (2180, 'Exciting fast hit'),
    'sw_fast': (1492, 'Cinematic whoosh fast transition'), 'sw_tunnel': (1486, 'Cinematic tunnel reverb woosh'),
    'sw_vac': (1465, 'Vacuum swoosh transition'), 'sw_speed': (1484, 'Speeding swoosh'),
    'sw_quick': (1464, 'Quick swoosh accent'), 'sw_air1': (2605, 'Quick air woosh'),
    'sw_air2': (2607, 'Fast air woosh'), 'sw_fly': (1469, 'Flying fast swoosh'),
    'sw_wind': (1471, 'Cinematic wind swoosh'), 'tape': (1088, 'Tape rewind cinematic transition'),
    'riser': (790, 'Cinematic trailer riser'), 'glitter': (2353, 'Magic glitter shot'),
    'amb_machine': (2504, 'Industrial machine hum'), 'amb_urban': (2505, 'Urban ambience during the day'),
    'amb_wind': (2658, 'Wind blowing ambience'),
    'app1': (476, 'Conference audience clapping strongly'), 'app2': (502, 'Auditorium moderate applause and cheering'),
}
def get(url, dst):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=60) as r, open(dst, 'wb') as f: f.write(r.read())
for role, (i, title) in SFX.items():
    dst = os.path.join(OUT, role + '.wav')
    if os.path.exists(dst): continue
    mp3 = os.path.join(OUT, role + '.mp3'); get(MIX % (i, i), mp3)
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', mp3, '-ac', '1', '-ar', '44100', '-af', 'loudnorm=I=-18:TP=-1.5:LRA=11' if role.startswith(('amb','app')) else 'volume=0dB', dst], check=True)
    os.remove(mp3); print(role, i, title)
