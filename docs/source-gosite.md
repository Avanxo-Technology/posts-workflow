# Contenido desde un proyecto gosite (artículos, imágenes, datos)

Caso típico: el usuario dice "en este proyecto gosite tengo X; usa este artículo para crear un video; las imágenes están en Cockpit".
La IA ya conoce gosite y Cockpit: aquí solo se fija cómo conectar esa fuente con el CLI.

## Dónde está cada cosa en un proyecto gosite (leer el MEMORY.md / ARCHITECTURE.md del proyecto para el detalle)
- **Artículos del blog**: colección `blogPosts` de Cockpit (addon Blog); publicados en la ruta del sitio (p. ej. `/articulos/<slug>`, `/noticias/<slug>`).
- **Imágenes**: campos de tipo `asset` en Cockpit (objeto con `path`/`url`); suelen estar en S3/MinIO, por carpeta de contenido (`maquinarias`, `site`, ...).
- **Lectura por API**: `GET /api/content/items/<colección>` y `/api/content/item/<singleton>` con cabecera `api-key` = `COCKPIT_API_TOKEN`
  del proyecto. El token vive en el `.env` del proyecto: se usa desde ahí y NUNCA se copia a este repo, a un index.html ni a un caption.
- Alternativa sin token: leer la página publicada (HTML) y descargar las imágenes por su URL pública.

## Si el proyecto no está arriba
Comprobar que el sitio local responde (puertos en el README o `gosite.yml` del proyecto; p. ej. GMAQ: app :8000, Cockpit :8001). Si no responde, subirlo con gosite:
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
