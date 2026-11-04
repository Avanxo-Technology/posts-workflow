# Flujo de trabajo (carrusel y video)

Estructura: ver docs/legacy.md (piezas nuevas: <marca>/<mes>/postN y <marca>/<mes>/postVideos/postVideoN).

## Pasos
 1. Recibir la solicitud. Consultar SOLO lo que no se pueda deducir (ver "Qué preguntar").
 2. `posts brand show <marca>` (colores, fuentes, contacto, diseño, ideas ya hechas) y leer brands/<marca>.md solo si hace falta. Si el contenido viene de un
    proyecto gosite/Cockpit: docs/source-gosite.md. No repetir ideas ya hechas.
 3. Si no hay idea: proponer 4-6 ideas basadas en contenido REAL (artículos, servicios, catálogo, eventos) y recomendar una. Esperar la elección.
 4. `posts new <marca> carousel|video --title "Tema"` (mes y número automáticos).
 5. Mostrar la estructura (qué dice cada lámina / línea de tiempo del video con segundos, texto, imagen/clip, sonido). Esperar visto bueno.
 6. Construir index.html (y gen_audio.py con los MISMOS tiempos). Vista previa: `posts preview`, `posts export <video> --frame`.
 7. Corregir textos cortados, montados o ilegibles. `posts check <pieza>`.
 8. NO generar PNG ni reel.mp4 definitivos hasta que el usuario lo pida/apruebe. Entonces `posts export <carrusel>` o `posts export <video> --yes`
    (el MP4 exige --yes y solo se usa cuando el usuario lo indica), abrir el resultado y verificar.
 9. Escribir/actualizar caption.txt (docs/export.md). Si hay cambios posteriores: editar el HTML y avisar qué quedó desactualizado.
10. Revisar el checklist (docs/export.md) y decir qué datos quedaron pendientes de confirmar.

## Qué preguntar (solo si falta; todo en UN mensaje, numerado)
  - Marca y tipo de pieza; tema o fuente de contenido (URL del artículo/página).
  - Material: ruta exacta de fotos, logos, clips (y qué segundos usar; si se conserva su audio). No usar imágenes no confirmadas.
  - Video: duración deseada; texto que deba aparecer sí o sí; ¿CON o SIN efectos de sonido? (`posts new ... --sound on|off`, o `posts sound <video> on|off`);
    ¿hay un video de referencia para inspirar transiciones/ritmo? (docs/reference-video.md, `posts analyze`). Carrusel: número de láminas (por defecto 3).
  - Datos a confirmar: contacto, fechas, horas, lugares, cifras; cuál dominio si el sitio muestra dos.
  NO volver a preguntar lo que ya está en brands/<marca>.md/.json ni la ubicación de los posts (la raíz es la carpeta de este archivo).
  Si la marca no tiene archivo de diseño (brands/<marca>.json -> designFile null, o el archivo no existe): pedir la ruta al usuario; si no la
  tiene, pedir PERMISO EXPRESO para buscarlo dentro de los proyectos gosite (la carpeta PROJECTS_DIR, ver `posts help`) y decir dónde se va a buscar. No buscar en otros sitios.
  Marca nueva (sin brands/<marca>.json): pedir nombre, 3 colores (#RRGGBB oscuro/claro/acento), fuente de títulos y de texto (Google Fonts), logo,
  contacto y sitio web; luego `posts brand add <id> ...` (ver README) y completar brands/<id>.md.

## Aprobaciones (nunca saltarlas)
  Estructura -> construir. Vista previa -> export definitivo. Cambios posteriores -> avisar y regenerar solo si lo piden.

## Subir una marca nueva al repo (solo si el usuario lo pide)
  posts brand add <id> ...  ->  completar brands/<id>.md y contact en brands/<id>.json  ->
  git add brands/<id>.json brands/<id>.md brands/<id>/  &&  git commit -m "Marca <id>"  &&  git push
  Antes de hacer commit: revisar que no haya tokens ni datos que no deban compartirse.
