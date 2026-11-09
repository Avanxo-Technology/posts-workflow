# Estructuras antiguas e inconsistencias conocidas

Para piezas nuevas se usa SIEMPRE:
  <marca>/<mes>/postN                    carrusel
  <marca>/<mes>/postVideos/postVideoN    video
  <marca>/_shared/                       recursos de la marca (rutas ../../../_shared desde un video)
  posts/_shared/                         render.mjs, export-carousel.mjs, posts.mjs, carousel-template.html (únicos)

Algunos equipos tienen piezas anteriores con estructuras distintas (copias de `_shared` por mes, videos directamente bajo el mes, etc.). Siguen funcionando con sus rutas relativas y `posts list/check/export` las reconocen. El detalle de esas estructuras vive con las marcas reales, en la carpeta privada (ver «Marcas privadas» en el README), no en este repo.
