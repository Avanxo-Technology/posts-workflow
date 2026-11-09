# Sello (zoom desde grande)
El elemento aparece enorme (escala 2.4-3.4) y se encoge hasta encajar con un pequeño rebote: `zoomIn` (con rotación `--r`), `stampIn` (con -14°) y `stamp` (escala 3 con -24°). Efecto de sello o impacto.

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. Sellos, cifras y rótulos de impacto.

## Notas
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek`.
