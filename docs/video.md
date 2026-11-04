# Videos / reels (1080x1920, 30 fps, HTML + audio -> MP4)

## Arquitectura
Un video es una PÁGINA HTML cuyo estado es una función pura del tiempo t. No se graba la pantalla en vivo:
se coloca la página en cada instante t, se toma una captura y ffmpeg las junta con el audio.

Piezas de cada video (carpeta <marca>/<mes>/postVideos/postVideoN/):
  index.html     fuente: escenas, textos, animaciones, reproductor de vista previa. ES la fuente de verdad de los tiempos.
  gen_audio.py   genera sfx.wav (efectos/música) con los MISMOS tiempos que el index.html.
  sfx.wav        audio del video (salida de gen_audio.py).
  img/ o media/  imágenes, logos, clips .mp4 que usa el HTML.
  (render)       NO va en la carpeta del video: es único para todas las marcas, posts/_shared/render.mjs (lo llama `posts export`).
  reel.mp4       resultado: 1080x1920, 30 fps, H.264 yuv420p crf 16 + AAC 192k, +faststart.
  caption.txt    texto del post.   guion.txt  (opcional) línea de tiempo en texto.

Contrato entre index.html y render.mjs (si se rompe, el render falla o sale en blanco):
  - window.seek(t)         coloca TODO en el segundo t (animaciones, contadores, clips). Puede devolver una Promise.
  - window.REEL_TOTAL      duración total en segundos.
  - window.MEDIA_READY     solo si hay <video>: false hasta cargar los clips, luego true.
  - ?rec=1 en la URL       modo de grabación: oculta la barra del reproductor, escala 1:1, silencia el audio.
  - document.fonts         el render espera a que las fuentes estén cargadas.

Cómo se anima (igual en las 4 marcas): TODO con CSS y delays absolutos. Cada elemento lleva variables:
    <div class="k" style="--n:slam;--s:1.2s;--t:.6s">...</div>
      --n nombre de la animación (@keyframes)   --s segundo en que arranca   --t duración
  Cada escena es <section class="scene" style="--s:INICIO;--d:DURACIÓN"> (visible solo entre --s y --s+--d).
  El reproductor pausa todas las animaciones (document.getAnimations()) y les asigna currentTime = t * 1000.
  Por eso NO se usan setTimeout, JS por tiempo real ni animaciones infinitas sin control: todo debe ser reproducible por t.
  Lo que no se puede expresar en CSS (contadores, barras de progreso, calendarios) se calcula en una función frame(t)
  (AGA: VIDEO.frame) o se resuelve con más keyframes.

Reproductor de vista previa (abrir index.html en el navegador): barra con PAUSA/REINICIAR/SONIDO, ← → = ±1 s,
espacio = pausa, R = reiniciar, M = sonido. ?t=SEGUNDOS abre pausado en ese instante.

## Construcción del index.html
Punto de partida: `posts new <marca> video --title "Tema"` crea la carpeta con index.html (plantilla de la marca) y gen_audio.py
(plantilla de sonido de la marca). Cambiar TÍTULO, "var TOTAL=" (o total: en AGA) y las escenas.
  GMAQ, PIROTECNIA, GREMCO: plantilla con reproductor inline (_shared/video-template.html).
  AGA: plantilla sobre ../../../_shared/engine.js y aga.css; VIDEO = {total, trans, hits, frame} se define antes de cargar el motor.

Estructura típica de un video (16-33 s): 4 o 5 escenas de 3-6 s.
  1) Portada (0-4 s): gancho + titular gigante + imagen/clip protagonista.
  2-3) Contenido: un mensaje por escena (pasos, errores, datos, clip).
  4) Cierre (últimos 3-4 s): llamada a la acción + contacto (WhatsApp, web) + sede si aplica.
  Transiciones de 0.6-0.9 s entre escenas (persianas, aro/iris, barrido). Si hay un clip continuo, NO cortar:
  solo cambiar los textos sobre él (GMAQ postVideo1: un clip de 8.9 s con dos grupos de texto).

Sincronización (LO MÁS IMPORTANTE):
  Los segundos de cada golpe visual (entrada de titular, check, tarjeta, transición, clip) están escritos en dos sitios:
  el index.html y gen_audio.py. Si se cambia un tiempo en uno, se cambia en el otro y se vuelve a correr gen_audio.py.
  Dejar un comentario con los cortes de escena arriba de gen_audio.py (A_SW, B_AT, C_SW en GMAQ; swap en AGA).
  HITS / "hits": lista de segundos con sacudida de pantalla; igualarla a los golpes fuertes del audio.

Texto y composición (video vertical, zona segura):
  - Tipografía gigante de marca, márgenes laterales de 60-80 px. Los videos existentes dejan la cabecera en y≈84-96 y el
    cierre/contacto hasta y≈1700; la interfaz de Instagram tapa parte de los extremos, así que no poner datos clave
    (teléfono, fecha) en los últimos ~200 px inferiores sin revisar el fotograma.
  - Una idea por escena; texto que entra con animación escalonada (el titular por líneas, 0.25 s de diferencia).
  - Contraste alto sobre clips: usar degradado oscuro (scrim) arriba/abajo.
  - Zoom lento (Ken Burns, kb/kbin) en fotos fijas para que no se vean congeladas.
  - Fotos con borde redondeado + zoom: en Chrome parpadean; aislar en capa propia (ver .photo en aga.css) o evitar el radio.
  - Poca duración total: 15-20 s funciona para promos; 28-33 s para guías/explicativos (AGA).
  - Cuando el cliente aporta clips reales (GMAQ, GREMCO), el clip es el protagonista; las fotos son apoyo. No repetir tomas.

Clips <video> dentro del HTML (GMAQ, GREMCO):
  <video class="vfull" src="img/clip-b.mp4" data-s="3.66" muted playsinline preload="auto"></video>
  data-s = segundo de la LÍNEA DE TIEMPO en que arranca el clip. El reproductor lo coloca con seek (currentTime = t - data-s).
  GREMCO además usa data-d (duración en pantalla) y data-off (segundo del clip donde empieza).
  Los clips van SIEMPRE muteados en el HTML; su sonido original, si se quiere, entra por gen_audio.py (docs/audio.md).

## Sonido opcional
Cada video puede grabarse CON o SIN efectos de sonido (preguntar al usuario). `posts new <marca> video --sound off` (no crea gen_audio.py) o `posts sound <video> on|off`
(guarda piece.json). Con sonido off: `posts audio` no hace nada, `posts check` no exige sfx.wav y el MP4 sale sin pista de audio.
Para forzar en un export: `posts export <video> --yes --sound on|off`.

## Video de referencia
Si el usuario pasa un video para inspirar transiciones o ritmo: docs/reference-video.md (`posts analyze`).

## Clips y render
Preparar un clip del cliente (de ~/Downloads u otra carpeta; confirmar la ruta con el usuario):
  - Formato usado hasta ahora: vertical 576x1024, 24-30 fps, H.264, 3-9 s, recortado a lo que se usará.
    ffmpeg -ss INICIO -t DURACIÓN -i original.mp4 -vf "scale=-2:1024" -an -c:v libx264 -crf 20 -pix_fmt yuv420p img/clip-a.mp4
    (si el clip es horizontal y hay que usarlo vertical, recortar al centro o ponerlo en una tira, no estirarlo)
  - Audio original (GREMCO): ffmpeg -i original.mp4 -ss INICIO -t DURACIÓN -vn -ac 1 -ar 44100 media/clip-a.wav
  - Miniatura (GREMCO): ffmpeg -ss 0.5 -i media/clip-a.mp4 -frames:v 1 -vf scale=240:-2 media/clip-a.thumb.jpg
  - Nunca modificar el original; trabajar con copias dentro de la carpeta del video.

Revisar antes de grabar (no cuesta nada, no toca reel.mp4):
    posts export <video> --frame 1.5 /tmp/f1.png        # varios instantes: entrada, medio, cierre, transiciones
  Abrir los PNG y verificar: texto no cortado ni montado, contacto correcto, clips visibles, transiciones sin franjas.
  Si el reproductor se abre con ?t=SEGUNDOS se ve lo mismo en el navegador.

Grabar (SOLO cuando el usuario lo pida/apruebe; tarda varios minutos; el tiempo depende del equipo):
    posts audio <video>                        # si no hay sfx.wav o cambió algo (omitir si el sonido está en off)
    posts export <video> --yes                 # -> reel.mp4 (SOLO si el usuario lo indicó; sin --yes se niega)
    posts check <video>                        # duración, 1080x1920, 30 fps, AAC, tiempos del HTML = audio = video
  Si el render tarda más de 2 min en una herramienta con límite de tiempo, ejecutarlo en segundo plano y esperar.
  Varios Chrome en paralelo: `posts export <video> --yes --workers N`. Por defecto el render elige solo (hasta 4, según CPU y RAM libre; ver la primera
  línea de su salida). Con clips `<video>` usa 1 por defecto (buscar muchos clips a la vez falla); forzar N solo si se prueba. Cada Chrome extra consume
  memoria: en equipos con poca RAM usar `--workers 1` o 2. El resultado es el mismo con cualquier N (MP4 idéntico byte a byte en la prueba).
  Medición (8 CPU, 6 s de video GMAQ sin clips): 1 trabajador 175 s y ~1.55 GB; 2 trabajadores 105 s y ~2.0 GB; 4 trabajadores 54 s y ~2.8 GB (memoria pico
  de todo el render). Cada Chrome extra suma ~0.4 GB aprox.
  Después: ffprobe reel.mp4 -> 1080x1920, 30 fps, duración = REEL_TOTAL, con pista de audio AAC. Mirar 3-4 fotogramas.
  El comando es el mismo para videos nuevos y antiguos (GMAQ/GREMCO directo bajo el mes, Pirotecnia december).
  Requisitos: google-chrome (o CHROME=/ruta), ffmpeg, Node 22+, Python 3. Puerto de depuración aleatorio: se pueden
  renderizar varios videos a la vez sin chocar.
