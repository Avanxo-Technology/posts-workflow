# Deslizar desde un lado
Entra horizontalmente ~160 px con fade (`left` desde la izquierda, `right` desde la derecha). Es más sobrio que `slam-sides`: se usa para eyebrows y etiquetas.

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. Más sobrio que `slam-sides`: úsalo para etiquetas y líneas de texto pequeñas.

## Notas
- Equivale a los antiguos `left` y `right` de las plantillas.
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek`.
