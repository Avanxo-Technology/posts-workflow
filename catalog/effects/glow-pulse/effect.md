# Resplandor que late
Opacidad .7 a 1 en bucle de 1.2 s sobre un degradado radial (`glow`) o un haz de luz (`beam`). Da vida al fondo.

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. Colócalo dentro de la escena, detrás del contenido (ajusta `left`/`top` con tu propio CSS si no va centrado).

## Notas
- Equivale al antiguo `glowp`. El degradado usa el color elegido; en Pirotecnia mezclaba amarillo y rojo.
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek`.
