# Sacudida de pantalla (golpe)
En cada instante de `HITS` el contenedor del video se desplaza con una oscilación amortiguada (~18 px, .5 s) y se reescala lo justo para que no asomen bordes. Va unida a un golpe de audio. Se registra una vez por instante de golpe; la mayoría coincide con la entrada de un título.

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. Envuelve el contenido de la escena. Pon un golpe de audio en `--fx-delay` (un golpe fuerte). Para varios golpes, usa un envoltorio por golpe.

## Notas
- Reproduce la fórmula de `shake()` del reproductor (oscilación amortiguada de ~18 px durante .5 s, con un zoom mínimo para que no asomen los bordes). En un kit envuelve a todos los demás elementos.
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek`.
