# Escena sube
La escena entra desde abajo (`inUp`, translateY 104 % a 0) o sale hacia arriba (`outUp`, -22 %).

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. Pon las dos escenas dentro de `.fx-sceneup` y mantén visible la saliente mientras dura la transición.

## Notas
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek`.
