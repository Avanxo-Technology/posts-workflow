# Número gigante (sello)
Cifra gigante que entra a escala 1.7 y se asienta, se queda y sale encogiendo a .6. La animación incluye entrada y salida en una sola definición.

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. La animación incluye entrada y salida: pon en `--fx-duration` lo que dura la escena de la cifra.

## Notas
- Equivale al antiguo `num` de GREMCO.
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek`.
