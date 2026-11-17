"""Genera sfx.wav de este video con efectos reales + ambiente + audio original de los clips (../../../_shared/sfxlib.py).
Antes, una sola vez: python3 ../../../_shared/fetch_sfx.py (solo si faltan sonidos en _shared/sfx). Uso: python3 gen_audio.py
Los segundos salen de index.html. Roles disponibles: ver _shared/fetch_sfx.py."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', '_shared'))
os.chdir(HERE)                   # las rutas de clips (media/x.wav) son relativas a esta carpeta
from sfxlib import Mix

TOTAL = 8.0                      # = "var TOTAL" de index.html
m = Mix(TOTAL)
# ejemplo (cambiar por los tiempos reales de index.html)
# m.clip('media/clip-a.wav', 0.0, .6)                                # audio original de un clip (si se conserva)
m.s('sw_quick', .85, .4, dur=.7, fade=.25); m.s('hit_big', 1.4, .55, dur=2.4, hit=True, fade=.6)
m.s('sw_vac', 3.5, .55, dur=1.3, fade=.3); m.s('hit_fast', 4.2, .3, dur=1, hit=True, fade=.3)
m.s('hit_logo', 6.0, .7, dur=2, hit=True, fade=.8)
m.amb('amb_urban', 0, TOTAL, .3)
m.finish('sfx.wav')
