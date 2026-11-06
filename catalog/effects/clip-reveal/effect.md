# Revelado por máscara
Un `clip-path: inset` que pasa de 100% a 0 por la derecha: la banda o el texto se descubre de izquierda a derecha. En GMAQ se usa en bandas y rótulos; en GREMCO la misma animación (`reveal`) forma parte del tercio inferior.

## Cómo aplicarlo
`class="k"` y `style="--n:wipe;--s:<seg>s;--t:.45s"`.

## Notas
- Código real extraído de `gmaq/noviembre/postVideo1` (ver `snippet.css`); la definición canónica está en `_shared/base/video-template.html`.
- Los tiempos de index.html y gen_audio.py deben coincidir.
