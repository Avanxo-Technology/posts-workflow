# Revelado por máscara
Un `clip-path: inset` que pasa de 100% a 0 por la derecha: la banda o el texto se descubre de izquierda a derecha. Sirve para bandas, rótulos y tercios inferiores.

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. Bandas, rótulos y títulos que se descubren.

## Notas
- Equivale al antiguo `wipe` aplicado a un elemento (`--n:wipe`) y al `reveal` del tercio inferior de GREMCO.
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek`.
