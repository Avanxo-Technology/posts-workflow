# Odómetro (cifras que ruedan)
Una columna de 20 cifras (0-9 dos veces) se desplaza por `translateY`; dar una vuelta completa antes de parar (`--fx-to = cifra + 10`) hace el efecto de contador mecánico. Cada columna puede llevar su propio `--fx-delay` para que paren de una en una.

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. En transiciones, la clase va en la escena que ENTRA y esa escena debe quedar encima de la anterior (que se mantiene visible mientras dura el revelado).

## Notas
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek` (las propiedades `@property` también se animan con `currentTime`).
