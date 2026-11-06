# Trazo que se dibuja
`stroke-dashoffset` de 260 a 0: el trazo de un icono SVG se dibuja. Se usa en los iconos de las fichas.

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. Pon `pathLength="1"` en cada `<path>` para que el dibujo no dependa de su longitud.

## Notas
- Equivale al antiguo `draw` de Pirotecnia (que usaba un `stroke-dasharray` fijo de 260).
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek`.
