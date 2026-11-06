# Destello blanco
Pantalla blanca que sube a .9 de opacidad en el 12 % y se desvanece (.28 s). Marca un corte seco o un golpe. Pirotecnia usa otro recurso con el mismo nombre de clase: ver `light-burst`.

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. Colócalo encima de la escena y úsalo en un corte seco. Pon un golpe de audio en `--fx-delay`.

## Notas
- Equivale al `flash` de GREMCO. GMAQ usaba `flashx` (empezaba en el pico, .42 s): usa `--fx-duration:.42s`.
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek`.
