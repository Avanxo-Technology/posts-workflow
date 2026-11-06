# Tercio inferior animado
Rótulo compuesto: barra naranja (crece), kicker (sube), título (revelado por máscara), subtítulo (sube) y salida suave. Se usa para identificar cada escena de foto.

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. Edita el kicker y el subtítulo en el HTML; el título es el texto del kit. Pon en `--fx-duration` lo que dura la escena.

## Notas
- Equivale al `.lt` de los reels de GREMCO. Usa la fuente del sistema: añade `font-family` con la de tu marca.
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek`.
