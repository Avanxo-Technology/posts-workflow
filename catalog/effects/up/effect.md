# Subida suave
El elemento sube 80 px mientras aparece. Es la entrada estándar para subtítulos, fechas y pies de foto. AGA y GMAQ usan una variante llamada `rise` (90 px). En GREMCO también hay un `rise` (26 px) dentro del tercio inferior.

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. Úsalo para subtítulos, fechas y pies de foto.

## Notas
- Con los valores por defecto equivale al antiguo `--n:up` de las plantillas (`.k`). GREMCO y AGA usan variantes (`rise`) con otras distancias: ajusta `--fx-distance`.
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek`.
