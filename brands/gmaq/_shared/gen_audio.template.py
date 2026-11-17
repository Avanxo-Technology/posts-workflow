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
pad(0, TOTAL / 2, (D3, A3, D4), .10); pad(TOTAL / 2, TOTAL / 2, (G3, D4, G4), .10)
airbrake(.05, .3, .35); stab(.3, 73.4, .9, .6); drop(.3, .45, .6)      # entrada de portada
pluck(.6, D4, .4); wood(1.2, .6)                                         # titular
ratchet(3.4, 9, .03, .45, 2800, .97); drop(4.0, .5, 1.0, 190, 34)     # transición a escena 2
stab(4.3, 98, .55, .4); pluck(4.35, D5, .35)                            # titular de cierre

finish(os.path.join(HERE, 'sfx.wav'))
