# Tambor 3D que gira
Cada cara va en `rotateX(-i·A) translateZ(R)`; el contenedor gira `i·A` y se queda quieto un rato en cada cara (los `@keyframes` tienen mesetas). Para 6 caras: A = 60°, R = h / 2 / tan(30°), y keyframes `fx-drum6` (las mesetas ocupan el 66 % de cada tramo). Las caras vecinas se ven inclinadas por la perspectiva.

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. En transiciones, la clase va en la escena que ENTRA y esa escena debe quedar encima de la anterior (que se mantiene visible mientras dura el revelado).

## Notas
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek` (las propiedades `@property` también se animan con `currentTime`).
