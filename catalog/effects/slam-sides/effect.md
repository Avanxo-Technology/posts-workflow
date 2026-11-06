# Slam lateral
Variante lateral de `slam`: entra desde la izquierda (`slamL`) o la derecha (`slamR`) 520 px, más grande, con rebote. Se alternan en títulos de dos líneas. En AGA las variantes no escalan y recorren 700 px.

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. Alterna izquierda y derecha en titulares de dos líneas.

## Notas
- Equivale a los antiguos `slamL` y `slamR`. En AGA no escalaban y recorrían 700 px: usa `--fx-scale:1` y `--fx-distance:700px`.
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek`.
