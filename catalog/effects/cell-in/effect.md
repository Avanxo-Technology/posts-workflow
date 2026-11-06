# Celdas que entran
Una imagen o celda del collage entra deslizándose desde un borde (`cellL`, `cellR`, `cellU`, `cellD`, ±102 %). Permite montar varias fotos en una escena escalonando `--cd`.

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. Para un collage, escalona `--fx-delay` entre celdas.

## Notas
- Reúne los antiguos `cellL`, `cellR`, `cellU` y `cellD` de GREMCO. Si la celda está recortada por un contenedor con `overflow:hidden`, el desplazamiento se ve como una entrada desde el borde.
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek`.
