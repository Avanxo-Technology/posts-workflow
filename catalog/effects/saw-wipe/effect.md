# Barrido en sierra
`clip-path: polygon` de 22 vértices en zigzag; la posición de todos los vértices depende de una sola variable animada (`@property`).

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. En transiciones, la clase va en la escena que ENTRA y esa escena debe quedar encima de la anterior (que se mantiene visible mientras dura el revelado).

## Notas
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek` (las propiedades `@property` también se animan con `currentTime`).
