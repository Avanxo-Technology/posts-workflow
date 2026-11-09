# Check que aparece
El icono ✓ aparece desde escala .2 con giro de -30°, rebasa a 1.15 y se asienta. Se usa para marcar los pasos de una lista.

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. Marca los pasos de una lista; escalona `--fx-delay` por fila (~.45 s).

## Notas
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek`.
