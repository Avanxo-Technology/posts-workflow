# Producto que entra
Imagen de producto que entra con giro y rebote desde un lado: `inD` (cae de arriba), `inL`/`inR` (laterales con 50° de giro), `inU` (sube 700 px), `launch` (diagonal) y `rise` (sube 520 px con -7°). Todas terminan en la rotación `--r` que se define por elemento.

## Cómo aplicarlo
`<img class="prod k" style="--n:inL;--s:<seg>s;--t:.55s;--r:-7deg">`. Cada pieza ajusta `--r`.

## Notas
- Código real extraído de `pirotecnia/december/postVideos/postVideo1` (ver `snippet.css`); la definición canónica está en `brands/pirotecnia/_shared/video-template.html`.
- Los tiempos de index.html y gen_audio.py deben coincidir.
