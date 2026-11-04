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
Los efectos de sonido de AGA y GREMCO no se versionan: `python3 brands/aga/_shared/fetch_sfx.py` y
`python3 brands/gremco/_shared/fetch_sfx.py` los descargan. La música de AGA (2 mp3 de Mixkit) se indica en `brands/aga/_shared/CREDITOS-SONIDO.txt`.

## Uso
```
posts new <marca> carousel|video [--title "Tema"] [--month mes]   crea la carpeta con plantilla
posts list [marca] [mes]          posts preview <pieza> [N|seg] [--open]      posts audio <video>
posts export <carrusel> [N] [--out DIR]     posts export <video> [--frame seg salida.png]     posts check <pieza>
```
`posts help` muestra el detalle. Los videos se graban solo con aprobación (`posts export <video>`).

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
