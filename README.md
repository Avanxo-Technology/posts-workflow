# posts-workflow

Herramientas para producir carruseles (HTML -> PNG 1080x1350) y videos/reels (HTML + audio -> MP4 1080x1920) de Instagram para
GMAQ, AGA, GREMCO y Pirotecnia Favio Favio Domino. Este repositorio guarda **las herramientas, plantillas y documentación**;
las piezas (index.html, PNG, MP4, clips) viven aparte, en la carpeta de posts de cada equipo.

## Requisitos
Node 22+, Google Chrome, ffmpeg/ffprobe, Python 3.

## Instalación
```
git clone <este-repo> ~/tools/posts-workflow
cd ~/tools/posts-workflow
./posts init /ruta/a/la/carpeta/de/posts      # guarda la ruta (.posts-dir) y enlaza recursos dentro de esa carpeta
ln -s ~/tools/posts-workflow/posts ~/.local/bin/posts   # opcional: usar `posts` desde cualquier carpeta
```
Sonido: GMAQ, Pirotecnia y cualquier marca nueva usan sonido sintetizado (sin descargas). AGA trae sus 48 efectos en el repo
(`brands/aga/_shared/sfx/`) y su música de fondo es OPCIONAL: sin `brands/aga/_shared/music/33.mp3` el video queda solo con efectos.
Los efectos de GREMCO se descargan una vez: `python3 brands/gremco/_shared/fetch_sfx.py`.

## Uso con Claude Code (la IA usa el CLI)
Abre Claude Code en la carpeta de posts (o en tu proyecto gosite) tras `posts init`; lee `AGENTS.md` solo. Ejemplo de prompt:
> En este proyecto gosite tengo el blog y las imágenes en Cockpit. Usa el artículo "…" para crear un video de la marca X; las imágenes
> las encuentras en Cockpit. Sigue WORKFLOW.md y muéstrame la estructura antes de construir.

La IA ya conoce gosite/Cockpit: el CLI, `docs/` y `brands/` le dan el resto (ver `docs/source-gosite.md`). Futuro: publicar en redes (`docs/roadmap.md`).

## Marca nueva (cualquier proyecto)
```
posts brand add mimarca --name "Mi Marca" --dark "#1A1A2E" --light "#F5F5F5" --accent "#E94560" --head "Montserrat" --body "Inter" \
  --whatsapp "300 000 0000" --web mimarca.com [--short "MIMARCA"] [--design /ruta/DESIGN.md]
posts new mimarca carousel --title "Tema"        # o: video
```
Crea `brands/mimarca.json/.md` y `brands/mimarca/_shared/` (plantilla de video con tus colores y fuentes, sonido sintetizado sin descargas)
y lo enlaza en tu carpeta de posts. Luego se completa `brands/mimarca.md` (logo, contacto, sitio). `posts brand list` muestra las marcas.

## Uso
```
posts new <marca> carousel|video [--title "Tema"] [--month mes]   crea la carpeta con plantilla
posts list [marca] [mes]          posts preview <pieza> [N|seg] [--open]      posts audio <video>
posts sound <video> [on|off]      posts analyze <video.mp4> [--from s --to s]   (video de referencia para transiciones)
posts export <carrusel> [N] [--out DIR]     posts export <video> --yes     posts export <video> --frame seg salida.png     posts check <pieza>
```
`posts brand show <marca>` resume en pocas líneas lo que la IA necesita de una marca. `posts help` muestra el detalle. El MP4 solo se graba con `--yes`, cuando el usuario lo indica. Cada video puede ir con o sin efectos de sonido (`--sound on|off`) y se puede pasar un video de referencia (`posts analyze`, `docs/reference-video.md`).

## Contenido
| Ruta | Qué es |
|---|---|
| `posts`, `_shared/posts.mjs` | CLI |
| `_shared/render.mjs` | render único de videos (Chrome por CDP + ffmpeg) |
| `_shared/export-carousel.mjs` | exportador de carruseles (una sesión de Chrome) |
| `_shared/carousel-template.html` | plantilla de carrusel |
| `brands/<marca>.json/.md` | configuración y datos de cada marca |
| `brands/<marca>/_shared/` | plantilla de video, plantilla de sonido, motor/librería de sonido de la marca |
| `docs/`, `WORKFLOW.md`, `AGENTS.md`, `guia-posts.txt` | guía para la IA, dividida por tarea, y prompt genérico |

Rutas de piezas nuevas: `<posts>/<marca>/<mes>/postN` (carrusel) y `<posts>/<marca>/<mes>/postVideos/postVideoN` (video).
Ver `docs/legacy.md` para las estructuras antiguas.
