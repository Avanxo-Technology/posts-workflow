# Subida suave
El elemento sube 80 px mientras aparece. Es la entrada estándar para subtítulos, fechas y pies de foto. Con `--fx-distance` se ajusta el recorrido (90 px para una variante más marcada, 26 px para una más discreta).

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. Úsalo para subtítulos, fechas y pies de foto.

## Notas
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek`.
