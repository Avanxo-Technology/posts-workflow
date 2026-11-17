CARPETA _SHARED · GMAQ · noviembre
Material común de los videos/reels de este mes. Cada video vive en ../postVideos/postVideoN (o ../postVideoN) y lo usa con rutas relativas.
Si empieza un mes nuevo y no existe _shared: copiar la del mes anterior (cp -r) y listo.

  (el render NO está aquí: es único para todos, en posts/_shared/render.mjs)
    cd <carpeta-del-video>; node "$POSTS_DIR/_shared/render.mjs" [--frame 2.5 a.png]   (POSTS_DIR = ruta absoluta de posts)
  synth.py            Librería de sonido sintetizada (sin dependencias). Ver el docstring del archivo para usarla desde gen_audio.py.
  video-template.html Punto de partida de index.html de un video nuevo: reproductor + animaciones por delays + 2 escenas de ejemplo.
                      Copiar como <video>/index.html, cambiar TÍTULO, TOTAL (var TOTAL=...) y escenas.

Flujo de un video: copiar video-template.html -> escribir escenas -> gen_audio.py (usa synth.py) -> render --frame ... (revisar)
-> aprobación del cliente -> render. Guía completa: posts/guia-posts.txt
Requiere Google Chrome, ffmpeg, Node 22+ y Python 3.
