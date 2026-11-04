# Flujo de trabajo (carrusel y video)

Estructura: ver docs/legacy.md (piezas nuevas: <marca>/<mes>/postN y <marca>/<mes>/postVideos/postVideoN).

## Pasos
 1. Recibir la solicitud. Consultar SOLO lo que no se pueda deducir (ver "Qué preguntar").
 2. Leer brands/<marca>.md y el archivo de diseño que indica. Revisar los caption.txt existentes de la marca (no repetir ideas).
 3. Si no hay idea: proponer 4-6 ideas basadas en contenido REAL (artículos, servicios, catálogo, eventos) y recomendar una. Esperar la elección.
 4. `posts new <marca> carousel|video --title "Tema"` (mes y número automáticos).
 5. Mostrar la estructura (qué dice cada lámina / línea de tiempo del video con segundos, texto, imagen/clip, sonido). Esperar visto bueno.
 6. Construir index.html (y gen_audio.py con los MISMOS tiempos). Vista previa: `posts preview`, `posts export <video> --frame`.
 7. Corregir textos cortados, montados o ilegibles. `posts check <pieza>`.
 8. NO generar PNG ni reel.mp4 definitivos hasta que el usuario lo pida/apruebe. Entonces `posts export <pieza>`, abrir el resultado y verificar.
 9. Escribir/actualizar caption.txt (docs/export.md). Si hay cambios posteriores: editar el HTML y avisar qué quedó desactualizado.
10. Revisar el checklist (docs/export.md) y decir qué datos quedaron pendientes de confirmar.

## Qué preguntar (solo si falta; todo en UN mensaje, numerado)
  - Marca y tipo de pieza; tema o fuente de contenido (URL del artículo/página).
  - Material: ruta exacta de fotos, logos, clips (y qué segundos usar; si se conserva su audio). No usar imágenes no confirmadas.
  - Video: duración deseada; texto que deba aparecer sí o sí. Carrusel: número de láminas (por defecto 3).
  - Datos a confirmar: contacto, fechas, horas, lugares, cifras; cuál dominio si el sitio muestra dos.
  NO volver a preguntar lo que ya está en brands/<marca>.md/.json ni la ubicación de los posts (la raíz es la carpeta de este archivo).
  Si la marca no tiene archivo de diseño (brands/<marca>.json -> designFile null, o el archivo no existe): pedir la ruta al usuario; si no la
  tiene, pedir PERMISO EXPRESO para buscarlo dentro de los proyectos de /home/guarapo/gosites y decir dónde se va a buscar. No buscar en otros sitios.
  Marca nueva (sin brands/<marca>.json): pedir nombre, 3 colores (#RRGGBB oscuro/claro/acento), fuente de títulos y de texto (Google Fonts), logo,
  contacto y sitio web; luego `posts brand add <id> ...` (ver README) y completar brands/<id>.md.

## Aprobaciones (nunca saltarlas)
  Estructura -> construir. Vista previa -> export definitivo. Cambios posteriores -> avisar y regenerar solo si lo piden.
