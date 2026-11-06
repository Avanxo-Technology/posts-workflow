# Etiqueta que sube
Etiqueta que sube 40 px con fade, se mantiene y se desvanece al final (entrada y salida en una sola definición).

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. Pon en `--fx-duration` lo que dura la escena.

## Notas
- Equivale al antiguo `lab` de GREMCO.
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek`.
