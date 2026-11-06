# Línea que sube (máscara)
Cada línea del titular vive en un contenedor `.clip` (overflow hidden) y su `span` sube desde 115% con fade, como si saliera de detrás de una máscara. Es el estilo de los titulares de AGA.

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. Una línea por contenedor `.fx-lineup-clip`; escalona `--fx-delay` entre líneas (~.25 s).

## Notas
- Equivale al antiguo `lineUp` de AGA.
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek`.
