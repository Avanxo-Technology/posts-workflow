# Estructuras antiguas e inconsistencias conocidas

Las piezas anteriores al 2026-11-04 NO se movieron. Para piezas nuevas se usa SIEMPRE:
  <marca>/<mes>/postN                    carrusel
  <marca>/<mes>/postVideos/postVideoN    video
  <marca>/_shared/                       recursos de la marca (rutas ../../../_shared desde un video)
  posts/_shared/                         render.mjs, export-carousel.mjs, posts.mjs, carousel-template.html (únicos)

Estructuras antiguas (siguen funcionando con sus rutas relativas; `posts list/check/export` las reconocen):
  aga/noviembre/_shared, gremco/noviembre/_shared        copias por mes (los videos antiguos las usan con ../../_shared o ../_shared)
  gmaq/noviembre/postVideo1-2, gremco/noviembre/reel1-2  videos directo bajo el mes
  pirotecnia/december/...                                carpeta con el mes en inglés (videos y reels)
Copias antiguas de render.mjs (equivalentes al único; se pueden borrar con autorización del usuario): GMAQ noviembre/postVideo1-2,
GREMCO noviembre/reel1-2, Pirotecnia december/postVideos/postVideo1-5 y reels/diciembre/reel2, aga/noviembre/_shared/render.mjs.

Carruseles
  - Una versión que parecía "página de Instagram" (marco, avatar, "me gusta") no era lo pedido: solo la pieza de diseño.
  - El primer diseño era demasiado "web" (tarjetas, tablas): se cambió a estilo póster.
  - Una tipografía que no era la de la marca (una serif) fue un error.
  - Un correo con dominio equivocado (g-maquinarias.com en vez de gmaquinarias.com) obligó a regenerar PNG.
  - Un resaltado (<mark>) con interlineado apretado se pisaba con la línea de arriba: dar interlineado/padding.
  - Un círculo "VS" quedó cortado por un contenedor con overflow:hidden: ponerlo fuera.
  - Un semáforo con 4 luces estaba mal: la herramienta de AGA usa 3 colores aunque tenga 4 niveles. Probar el flujo real.
  - Listas con filas de alturas distintas se veían desiguales: misma altura y espacio en cada fila.
Videos
  - Todo debe ser función del tiempo: nada de setTimeout ni animaciones libres; si no, el render sale distinto al preview.
  - Los tiempos están en dos archivos (index.html y gen_audio.py): cambiar uno sin el otro desincroniza el sonido.
  - Los navegadores bloquean el audio hasta que hay un clic (AGA muestra una pantalla "Reproducir con sonido").
  - Con fotos redondeadas y zoom Chrome parpadea: capa propia (.photo en aga.css).
  - La sacudida de pantalla debe escalar el contenido lo justo para no dejar franjas del fondo en los bordes (GMAQ).
  - Chrome/ffmpeg/Node: el render espera fuentes y clips cargados; si la página no define seek() el render aborta con mensaje.
  - En zsh no se debe escribir "====" como argumento de echo (lo interpreta como comando): citarlo.
Inconsistencias conocidas (no se corrigieron; decidir con el usuario)
  - pirotecnia/december (inglés) vs pirotecnia/diciembre: videos y carruseles en carpetas distintas; hay reels/diciembre/reelN dentro de december.
    Propuesta: mover todo a diciembre/postVideos/postVideoN y actualizar rutas relativas.
  - gmaq y gremco guardan los videos directo bajo el mes (sin postVideos/); aga y pirotecnia sí usan postVideos/.
  - Los guion.txt de GMAQ y Pirotecnia dicen "PENDIENTE: falta aprobación para grabarlo" aunque el reel.mp4 ya existe.
  - gremco/octubre/reel1 y reelextra1 no tienen pista de audio.
  - La palabra "reel" se usa para videos en gremco/pirotecnia y "postVideo" en aga/gmaq/pirotecnia: para piezas nuevas usar postVideoN.
  - gremco/noviembre/_shared tiene un __pycache__ sin uso.
