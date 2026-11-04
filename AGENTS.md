# posts — producción de carruseles y videos de Instagram (GMAQ, AGA, GREMCO, Pirotecnia)

Raíz: esta carpeta. CLI: `./posts help` (comandos: new, list, preview, audio, export, check).

## Reglas que siempre aplican
- Pieza = index.html editable. Carrusel 1080x1350 -> PNG. Video 1080x1920, 30 fps -> reel.mp4.
- Todo sale del sitio real de la marca o del material que da el usuario. Nada de datos inventados ni promesas no verificadas.
- Sin número de lámina, sin marcos de interfaz de Instagram. Estilo póster, no página web. Tipografía y colores de la marca.
- NO generar PNG/MP4 definitivos sin que el usuario lo pida/apruebe. Mostrar estructura y vista previa antes.
- No modificar piezas existentes (PNG, reel.mp4, sfx.wav) salvo petición expresa. Probar siempre sobre copias o con --out.
- En video los tiempos van en index.html y en gen_audio.py: deben coincidir.
- No borrar, mover ni publicar nada (GitHub, redes) sin confirmación.

## Qué leer según la tarea (no leas el resto)
| Tarea | Leer |
|---|---|
| Cualquier pieza | WORKFLOW.md + brands/<marca>.md |
| Carrusel | docs/carousel.md |
| Video | docs/video.md + docs/audio.md |
| Exportar, caption, revisar | docs/export.md |
| Marca que no existe | `posts brand add` (README) + WORKFLOW.md |
| Algo antiguo o raro | docs/legacy.md |
| Prompt para pegar en otra IA | guia-posts.txt |
