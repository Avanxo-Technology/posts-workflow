# Panel naranja que barre
Un panel naranja de pantalla completa (con borde navy) que se descubre de izquierda a derecha con `clip-path` (.8 s) y cubre la escena. Es la transición entre escenas en los reels de octubre y en `reelextra1`.

## Cómo aplicarlo
`<div class="wipe" style="--s:<seg>s">` entre escenas; la escena siguiente debe empezar con la pantalla cubierta (~.4 s).

## Notas
- Código real extraído de `gremco/noviembre/reel1` (ver `snippet.css`); la definición canónica está en `brands/gremco/_shared/video-template.html`.
- Los tiempos de index.html y gen_audio.py deben coincidir.
