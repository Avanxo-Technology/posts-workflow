# Sonido de los videos (una paleta por marca)

SONIDO OPCIONAL por pieza: `posts sound <video> on|off` (piece.json). Con off no se necesita gen_audio.py ni sfx.wav y el MP4 sale sin audio.
MÚSICA: solo AGA la usa y es OPCIONAL (si no existe brands/aga/_shared/music/33.mp3 el video queda solo con efectos). Marcas nuevas: sonido sintetizado (enfoque C), sin descargas.
Las plantillas gen_audio.template.py de cada <marca>/_shared ya traen el esqueleto correcto; `posts new <marca> video` lo copia como gen_audio.py.
Rutas de piezas nuevas: <marca>/<mes>/postVideos/postVideoN -> `../../../_shared` (la _shared de la marca).

El audio se genera aparte (gen_audio.py -> sfx.wav) y render.mjs lo une al video. render.mjs exige que sfx.wav exista.
Regla de calidad: el audio acompaña cada acción visible (entra un titular = whoosh + tick; cae una tarjeta = golpe;
check = clic; transición = barrido + impacto en el instante en que la pantalla queda cubierta).

A) AGA: efectos REALES + música con ducking
   from sfxlib import Mix, finish
   m = Mix(TOTAL); m.s('check', 6.1, .8, hit=True); ...; m.save('_sfx_raw.wav')
   finish(raw, '../../../_shared/music/33.mp3', 'sfx.wav', TOTAL)     # música baja sola (sidechain) y normaliza a -15 LUFS
   Efectos en <marca>/_shared/sfx/<rol>.wav (se bajan con fetch_sfx.py, una sola vez, requiere internet).
   Parámetros de m.s: rol, segundo, ganancia, dur (recorte), rate (tono/velocidad), hit=True (alinea el pico del
   sonido con el segundo indicado: usar en impactos), start (desde qué punto del sonido).
   Licencias: Mixkit (uso comercial, sin atribución) y Kenney (CC0). Ver CREDITOS-SONIDO.txt.

B) GREMCO: efectos REALES + ambiente + audio original de los clips
   from sfxlib import Mix
   m = Mix(23.85); m.clip('media/evento-1.wav', 0, .6); m.s('sw_vac', 2.95, .55, dur=1.3, fade=.3)
   m.amb('amb_urban', 0, 23.85, .3); m.finish('sfx.wav')
   Ambientes y clips bajan solos cuando suena un efecto fuerte; todo pasa por un limitador suave.
   Antes: python3 ../../../_shared/fetch_sfx.py (una sola vez). Sin música. Paleta documental (obturadores, impactos, whooshes).

C) GMAQ y PIROTECNIA: SINTETIZADO, SIN MÚSICA (solo librería estándar de Python, sin descargas)
   import sys, os
   sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '_shared'))
   import synth
   from synth import *
   synth.init(16.4, seed=515)      # TOTAL en segundos y semilla (misma semilla = mismo audio)
   ...llamar funciones con los segundos del index.html...
   finish('sfx.wav')
   GMAQ (synth.py): pluck, arp, wood, ratchet, drop, airbrake, sweep, stab, pad, motor + escala D3..A5.
   PIROTECNIA (synth.py): crackle, sizzle, thump, tick, pop, bang(s), whoosh, chime, whistle, rising, kick, bounce,
     crowd, boom, hum, rumble, shell, ding, slap, tock, ratchet, doppler, whip, beep, whine, shutter, flash_pop, motor, blades...
   Paletas propias de cada marca; no copiar sonidos de una a otra.
   Aviso: si un video no necesita funciones nuevas, no tocar synth.py. Si necesita una nueva, añadirla a synth.py
   (no a gen_audio.py) para que quede disponible a los siguientes.
   Si algo suena clipeado el pico impreso es el de ANTES de normalizar (puede ser >1; es normal, finish() lo baja a .89).

Verificar el audio: ffprobe sfx.wav (duración = TOTAL del video) y escuchar en el reproductor (botón SONIDO).
