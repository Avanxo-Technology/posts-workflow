# Celebración de gol
Compuesto de la escena del gol: texto "Gooool" enorme que cae con rebote (`goal`), red que aparece y se atenúa (`netin`/`outf`) y foco con parpadeo (`flick`).

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. Ponlo sobre la escena del gol; cambia el texto y los colores de las sombras por los de los equipos.

## Notas
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek`.
