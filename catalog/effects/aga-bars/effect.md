# Persianas alternas
8 persianas horizontales que entran y salen alternando sentido (derecha/izquierda) y color (lima/navy), con un pequeño desfase entre ellas.

Se dibuja en el canvas `#cv-tr` por el motor de AGA (`brands/aga/_shared/engine.js`, función `bars`); es función pura de `u` (0..1).

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. Colócalo encima de las escenas; cambia la escena en el marcador. Pon `tr_bars` en `--fx-delay`.

## Notas
- Reimplementación en CSS de la transición `bars` del motor de AGA (`engine.js`): las barras impares entran por la derecha y salen por la izquierda; las pares, al revés.
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek`.
