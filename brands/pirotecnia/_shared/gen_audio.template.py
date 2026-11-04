"""Genera sfx.wav de este video con la librería de sonido de la marca (../../../_shared/synth.py). SIN música.
Los segundos salen de index.html (escenas, entradas de texto, transiciones, golpes). Uso: python3 gen_audio.py"""
import sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', '_shared'))
import synth
from synth import *

TOTAL = 8.0                      # = "var TOTAL" de index.html
synth.init(TOTAL, seed=1)        # misma semilla = mismo audio

# ejemplo: escena 1 (0-4 s) y escena 2 (4-8 s). Cambiar por los tiempos reales.
thump(.35, 90, .3, .9); whoosh(.3, .5, .4); tick(.8, 1300, .3)           # entrada de portada
sizzle(1.0, 2.8, .4, 2500, 6500, 'bell'); crackle(1.0, 2.8, 200, .5)      # chispa
rising(3.3, .6, 400, 2500, .25); boom(4.0, .9)                           # transición a escena 2
thump(4.35, 85, .3, .9); chime(4.6, C6, .25); chime(4.7, E6, .22)         # cierre

finish(os.path.join(HERE, 'sfx.wav'))
