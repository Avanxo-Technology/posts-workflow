# Barra de progreso global
Franja naranja de 7 px arriba que crece de 0 a 100 % durante todo el video (`--tot` = duración total).

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. Pon en `--fx-duration` la duración total de la pieza.

## Notas
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek`.
