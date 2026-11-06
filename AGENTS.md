# posts — producción de carruseles y videos de Instagram (GMAQ, AGA, GREMCO, Pirotecnia)

Raíz: esta carpeta. CLI: `./posts help` (comandos: new, list, preview, audio, export, check).

## Antes de empezar (requisitos)
Ejecuta `posts doctor` (con `--gosite` si el contenido viene de un proyecto gosite). Si algo FALTA, **instálalo tú ejecutando el comando que `posts doctor` indica**
y repite la comprobación hasta que diga "Todo listo". Si un comando requiere sudo o contraseña, pídele al usuario que lo corra con `! comando`.
Si el proyecto gosite no está arriba (su sitio local no responde), levántalo con los comandos de gosite: `gosite infra up` y `gosite start <proyecto>`
(si Docker está cerrado, ábrelo primero). Ver docs/source-gosite.md.

Primer paso con una marca: `posts brand show <marca>` (datos compactos; evita leer varios archivos).

## Reglas que siempre aplican
- Pieza = index.html editable. Carrusel 1080x1350 -> PNG. Video 1080x1920, 30 fps -> reel.mp4.
- Todo sale del sitio real de la marca o del material que da el usuario. Nada de datos inventados ni promesas no verificadas.
- Sin número de lámina, sin marcos de interfaz de Instagram. Estilo póster, no página web. Tipografía y colores de la marca.
- NO generar PNG/MP4 definitivos sin que el usuario lo pida/apruebe. Mostrar estructura y vista previa antes.
  El MP4 se graba SOLO con `posts export <video> --yes` y únicamente cuando el usuario lo indica expresamente (sin `--yes` el CLI se niega). Para revisar: `--frame`.
- No modificar piezas existentes (PNG, reel.mp4, sfx.wav) salvo petición expresa. Probar siempre sobre copias o con --out.
- En video los tiempos van en index.html y en gen_audio.py: deben coincidir.
- No borrar, mover ni publicar nada (GitHub, redes sociales) sin confirmación expresa. Hoy no existe publicación automática (docs/roadmap.md).
- Los tokens (COCKPIT_API_TOKEN, etc.) nunca se copian a este repo, a un index.html ni a un caption.

## Qué leer según la tarea (no leas el resto)
| Tarea | Leer |
|---|---|
| Cualquier pieza | WORKFLOW.md + brands/<marca>.md |
| Carrusel | docs/carousel.md |
| Video | docs/video.md + docs/audio.md (si el usuario pasa un video de referencia: docs/reference-video.md) |
| Exportar, caption, revisar | docs/export.md |
| Contenido (artículo, imágenes) de un proyecto gosite/Cockpit | docs/source-gosite.md |
| Marca que no existe | `posts brand add` (README) + WORKFLOW.md |
| "Usa el efecto del segundo N del post X" / buscar efectos ya usados | `posts effect at <post> <seg>` → `posts effect show <id>` → leer su effect.md (catalog/README.md) |
| Registrar en el catálogo un video nuevo o modificado | `posts effect scan <pieza>` y, si el resultado es correcto, `--write` (catalog/README.md) |
| Que el usuario configure una marca (colores, design.md, logos) | `posts catalog --open` → pestaña Marcas (catalog/README.md). `posts brand show <marca>` muestra el design.md y los logos del repo |
| El usuario te pasa un enlace de kit (`#/kit?k=…`) o pide combinar varios efectos | `GET /api/v1/kit?k=<kit>` (con `posts catalog` activo): aplica `code.css` una vez y `code.html` en orden, con los tiempos de `items[].start` (catalog/README.md, «Kit») |
| Usar un efecto del catálogo en una pieza | `GET /api/v1/effects/<id>?<param>=<valor>` (con `posts catalog` activo) o `posts effect show <id>`; copiar `code.css` una vez y `code.html` donde corresponda (catalog/README.md, «Contrato de efecto») |
| Que el usuario vea/explore los efectos | `posts catalog --open` (UI local; catalog/README.md) |
| Algo antiguo o raro | docs/legacy.md |
| Prompt para pegar en otra IA | guia-posts.txt |
