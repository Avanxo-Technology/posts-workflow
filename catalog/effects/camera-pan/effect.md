# Paneo de cámara
Desplazamiento horizontal de la imagen: `kbl`/`kbr` (±3 % con zoom 1.14), `pan` (banda panorámica que se desplaza 260 px) y `panx` (`object-position` de 0 a 100 %).

## Cómo aplicarlo
`--kb:kbl` o `--kb:kbr` en el contenedor `.m`; `panx` con la clase `.pan` en la imagen.

## Notas
- Código real extraído de `gremco/noviembre/reel1` (ver `snippet.css`); la definición canónica está en `brands/gremco/_shared/video-template.html`.
- Los tiempos de index.html y gen_audio.py deben coincidir.
