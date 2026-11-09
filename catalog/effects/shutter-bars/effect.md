# Persianas alternas
8 persianas horizontales que entran y salen alternando sentido (derecha/izquierda) y color (dos colores configurables), con un pequeño desfase entre ellas.

Es una transición de pantalla completa: función pura del tiempo normalizado `u` (0..1).

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. Colócalo encima de las escenas; cambia la escena en el marcador. Sincroniza el sonido de transición con `--fx-delay`.

## Notas
- Las barras impares entran por la derecha y salen por la izquierda; las pares, al revés.
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek`.
