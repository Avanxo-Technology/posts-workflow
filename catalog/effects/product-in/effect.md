# Producto que entra
Imagen de producto que entra con giro y rebote desde un lado: `inD` (cae de arriba), `inL`/`inR` (laterales con 50° de giro), `inU` (sube 700 px), `launch` (diagonal) y `rise` (sube 520 px con -7°). También hay `drop` (cae de arriba) y `fly` (sube con 10° de giro), con recorridos más largos de 700 a 1100 px. Todas terminan en la rotación `--r` que se define por elemento.

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. Ponlo sobre un `<img>` de producto. `--fx-rotate` fija la inclinación final de cada imagen.

## Notas
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek`.
