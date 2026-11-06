# Empuje de escena
La escena nueva entra empujando desde la derecha (`inPush`, translateX 104 % a 0) y la saliente se desplaza -24 % (`outPush`). Es la transición básica entre fotos en los reels de GREMCO.

## Cómo aplicarlo
En el `.wrap` de la escena: `--in:inPush` y/o `--out:outPush` (la salida arranca 0.5 s antes del fin). El tiempo de la nota es el de cada animación.

## Notas
- Código real extraído de `gremco/noviembre/reel1` (ver `snippet.css`); la definición canónica está en `brands/gremco/_shared/video-template.html`.
- Los tiempos de index.html y gen_audio.py deben coincidir.
