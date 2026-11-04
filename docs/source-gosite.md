# Contenido desde un proyecto gosite (artículos, imágenes, datos)

Caso típico: el usuario dice "en este proyecto gosite tengo X; usa este artículo para crear un video; las imágenes están en Cockpit".
Esta guía no asume que la IA conozca gosite: lo que necesita saber está aquí; el detalle de cada proyecto, en su README.md, MEMORY.md y ARCHITECTURE.md.

## Qué es gosite y cómo se relaciona con Cockpit
- **gosite** es la herramienta de línea de comandos que crea y levanta los proyectos web (Go + Cockpit) en Docker para desarrollo (`gosite --help`).
  No guarda contenido: arranca y apaga el entorno.
- **Un proyecto gosite** son dos servicios más una infraestructura compartida:
  - la **app** (Go): el sitio web; genera el HTML y lee su contenido de Cockpit por su API REST;
  - **Cockpit**: el CMS (headless) donde viven los datos: artículos, catálogo, textos de las páginas y las imágenes (assets);
  - **infraestructura compartida** (`gosite infra up`): Traefik (dominios `.test`), Redis (caché) y MinIO (almacena los assets, compatible con S3).
- **Entonces**: lo que el usuario llama "el artículo" y "las imágenes" están en **Cockpit**; el sitio solo los muestra. Para este flujo se lee de Cockpit
  (o de la página publicada que gosite sirve) y las piezas se crean en la carpeta de posts, no en el proyecto.
- Comandos para ubicarse: `gosite list` (proyectos y su estado), `gosite path <proyecto>` (ruta), `gosite start|stop|logs <proyecto>`,
  `gosite doctor` (verifica dependencias). La configuración local del proyecto está en su `.env` (puertos, `COCKPIT_URL`, `COCKPIT_API_TOKEN`).

## Dónde está cada cosa en un proyecto gosite (leer el MEMORY.md / ARCHITECTURE.md del proyecto para el detalle)
- **Artículos del blog**: colección `blogPosts` de Cockpit (addon Blog); publicados en la ruta del sitio (p. ej. `/articulos/<slug>`, `/noticias/<slug>`).
- **Imágenes**: campos de tipo `asset` en Cockpit (objeto con `path`/`url`); suelen estar en S3/MinIO, por carpeta de contenido (`maquinarias`, `site`, ...).
- **Lectura por API**: `GET /api/content/items/<colección>` y `/api/content/item/<singleton>` con cabecera `api-key` = `COCKPIT_API_TOKEN`
  del proyecto. El token vive en el `.env` del proyecto: se usa desde ahí y NUNCA se copia a este repo, a un index.html ni a un caption.
- Alternativa sin token: leer la página publicada (HTML) y descargar las imágenes por su URL pública.

## Si el proyecto no está arriba
Comprobar que el sitio local responde (`gosite list` muestra el estado; los puertos están en el README del proyecto o en su `.env`/`gosite.yml`; p. ej. GMAQ: app :8000, Cockpit :8001). Si no responde, subirlo con gosite:
1. `posts doctor --gosite` (Docker abierto y `gosite` instalado; si falta algo, instalarlo con el comando que indica).
2. `gosite infra up` (una vez por sesión: Traefik, Redis, MinIO) y `gosite start <proyecto>` (app + Cockpit).
3. Esperar a que responda (`curl http://localhost:<puerto>`) antes de leer artículos e imágenes. Al terminar, `gosite stop <proyecto>` solo si el usuario lo pide.
Otros comandos útiles: `gosite logs <proyecto>`, `gosite restart <proyecto>`. Las piezas se guardan SIEMPRE en la carpeta de posts, nunca dentro del repo del proyecto gosite.

## Flujo con el CLI
1. `posts brand show <marca>`: colores, fuentes, contacto, archivo de diseño (relativo a PROJECTS_DIR) e ideas ya hechas.
   Si el diseño no existe en este equipo, pedir la ruta al usuario (o permiso para buscarlo dentro de los proyectos gosite).
2. Obtener el artículo (texto, fecha, URL pública) y las imágenes que el usuario indique. Usar solo lo que el artículo/Cockpit contiene: nada inventado.
3. Copiar las imágenes elegidas a `<pieza>/img/` (máx. ~1400 px, .jpg/.webp), nunca enlazar a la red en el index.html (el render es offline-reproducible).
4. `posts new <marca> carousel|video --title "..."`, construir, `posts check`, mostrar vista previa, esperar aprobación, `posts export`.
5. caption.txt con el enlace público del artículo como llamada a la acción.

## Si la marca no existe aún
`posts brand add <id> ...` con los datos del proyecto (colores y fuentes salen de su DESIGN.md/CSS; contacto del sitio) y, si el usuario lo pide,
subirla al repo (ver WORKFLOW.md).
