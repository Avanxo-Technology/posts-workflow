"""Genera sfx.wav de este video: efectos REALES (../../../_shared/sfx) + música de fondo OPCIONAL con ducking. Uso: python3 gen_audio.py
Los segundos salen de index.html. Efectos disponibles: ver _shared/fetch_sfx.py (roles) y _shared/CREDITOS-SONIDO.txt."""
import sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
SH = os.path.join(HERE, '..', '..', '..', '_shared')
sys.path.insert(0, SH)
from sfxlib import Mix, finish

TOTAL = 8.0                      # = "total" de VIDEO en index.html
m = Mix(TOTAL)
# ejemplo (cambiar por los tiempos reales de index.html)
m.s('k_tick1', .1, .5); m.s('pop_bubble', .25, .7, hit=True)
m.s('title_whoosh', .35, .6); m.s('k_tick2', .85, .35)
m.s('tr_wipe', 3.52, .8); m.s('tr_wipe2', 4.0, .9, hit=True)      # transición 'wipe' en t0=3.5 (swap en t0+.504)
m.s('card_place', 4.6, .9, hit=True); m.s('bell', 6.5, .45, dur=1.5, fade=.5)
raw = os.path.join(HERE, '_sfx_raw.wav'); m.save(raw)
MUSIC = os.path.join(SH, 'music', '33.mp3')      # OPCIONAL: música de fondo (Mixkit #33); si no existe el archivo, el video queda solo con efectos
finish(raw, MUSIC if os.path.exists(MUSIC) else None, os.path.join(HERE, 'sfx.wav'), TOTAL)
os.remove(raw); print('sfx.wav listo')
