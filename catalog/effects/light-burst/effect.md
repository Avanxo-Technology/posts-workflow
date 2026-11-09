# Explosión de luz
Un círculo de luz gigante (`fl`) crece desde un punto (`--x`, `--y`) y cubre la pantalla, acompañado de un anillo (`rg`). Se usa para cambiar de escena como si fuera un estallido.

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. Colócalo encima de las escenas y cambia la escena en el marcador. Pon una explosión de audio en `--fx-delay`.

## Notas
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek`.
