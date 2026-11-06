# Pop
Aparece pequeño y girado, rebasa su tamaño y se asienta. Sirve para etiquetas, chips, precios y sellos pequeños.

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. `<div class="fx-pop" style="--fx-delay:2s;--fx-duration:.35s">Nuevo</div>`.
3. Para varias etiquetas seguidas, escalona `--fx-delay` cada ~.12 s.

## Notas
- Con los valores por defecto equivale al antiguo `--n:pop` de las plantillas (`.k`).
- El elemento no puede ser `inline` (las transformaciones no se aplican): usa `div` o `display:inline-block`.
