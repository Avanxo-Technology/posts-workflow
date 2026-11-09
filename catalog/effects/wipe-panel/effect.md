# Panel naranja que barre
Un panel naranja de pantalla completa (con borde navy) que se descubre de izquierda a derecha con `clip-path` (.8 s) y cubre la escena. Es la transición entre escenas en los reels de octubre y en `reelextra1`.

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. Colócalo encima de las escenas; la escena siguiente empieza en el marcador (`--fx-delay + --fx-duration / 2`).

## Notas
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek`.
