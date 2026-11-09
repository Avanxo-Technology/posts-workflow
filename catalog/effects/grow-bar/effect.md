# Barra que crece
`scaleX` de 0 a 1 desde la izquierda (con `transform-origin:left`). Se usa en subrayados y barras de acento.

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. Subrayados, líneas de acento y barras de datos. Para una barra vertical intercambia ancho y alto.

## Notas
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek`.
