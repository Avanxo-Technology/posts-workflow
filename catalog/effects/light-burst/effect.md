# Explosión de luz
Transición propia de Pirotecnia: un círculo de luz gigante (`fl`) crece desde un punto (`--x`, `--y`) y cubre la pantalla, acompañado de un anillo (`rg`). Se usa para cambiar de escena como si fuera un estallido.

## Cómo aplicarlo
`<div class="flash" style="--s:<seg>s;--x:..;--y:..">` y `<div class="ring">` con los mismos valores. La escena nueva debe empezar cuando la luz cubre la pantalla.

## Notas
- Código real extraído de `pirotecnia/december/reels/diciembre/reel1` (ver `snippet.css`); la definición canónica está en `pirotecnia/december/reels/diciembre/reel1/index.html`.
- Los tiempos de index.html y gen_audio.py deben coincidir.
