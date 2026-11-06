# Latido
Escala 1 a 1.03-1.05 en bucle (`infinite`). Se usa en el CTA o el teléfono para llamar la atención hasta el final del video.

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. Llamada a la acción o teléfono hasta el final del video. Es un bucle (`infinite`).

## Notas
- Equivale al antiguo `beat` (GREMCO 1.05, Pirotecnia 1.03). La vista previa muestra un ciclo.
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek`.
