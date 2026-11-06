# Sacudida de pantalla (golpe)
En cada instante de `HITS` (o `hits` en AGA) el contenedor del video se desplaza con una oscilación amortiguada (~18 px, .5 s) y se reescala lo justo para que no asomen bordes. Va unida a un golpe de audio. Se registra una vez por instante de golpe; la mayoría coincide con la entrada de un título.

## Cómo aplicarlo
Añade el instante a `HITS=[...]` en index.html y al mismo segundo en gen_audio.py con `hit=True`. Los tiempos de ambos deben coincidir.

## Notas
- Código real extraído de `None` (ver `snippet.js`); la definición canónica está en `_shared/base/video-template.html`.
- Los tiempos de index.html y gen_audio.py deben coincidir.
