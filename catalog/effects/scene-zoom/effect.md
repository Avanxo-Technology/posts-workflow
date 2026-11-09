# Escena con zoom
La escena entra desde escala 1.5 con fade (`inZoom`) y sale reduciéndose a .92 (`outZoom`). Se usa en escenas de cierre.

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. Úsala en escenas de cierre.

## Notas
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek`.
