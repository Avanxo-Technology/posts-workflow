# Persianas
7 barras de color (cobre claro, grafito…) de 121 px que cierran la pantalla y la vuelven a abrir, escalonadas .03 s. Cada barra entra en `--s1` y sale en `--s2` (~.62 s después); la escena cambia mientras la pantalla está cubierta. Hay variante vertical (`bar v`) y horizontal (`bar h`). El tiempo de la nota es el `--s1` de la primera barra.

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. La escena siguiente debe empezar en el marcador (con las barras cubriendo la pantalla). Pon un golpe de audio en ese instante.

## Notas
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek`.
