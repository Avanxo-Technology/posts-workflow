# Parpadeo
Opacidad 1 a .25 a 1; se usa 2 veces seguidas (`animation: blink .45s linear 4.2s 2`).

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. Resalta un elemento con un destello de opacidad.

## Notas
- Equivale al antiguo `blink` de Pirotecnia.
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek`.
