# Escena con tus elementos
Una escena con varios elementos que tú defines: añade los que quieras (hasta 8) y, para cada uno, elige **dónde termina** (posición en la pantalla), **de dónde sale** (abajo, arriba, izquierda, derecha, el centro, un fundido o un punto concreto) y **cuándo entra**.

## Cómo aplicarlo
1. Copia `code.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `code.html`: cada elemento es un `div` que puedes sustituir por tu propio contenido (texto, imagen…) conservando su clase.
3. `--fx-delay` es el segundo del video en que empieza; `--fx-gap` es el retraso entre un elemento y el siguiente.

## Notas
- Cada elemento termina en `left`/`top` (en % de la pantalla) y arranca desplazado `--dx`/`--dy`; por eso el origen puede ser cualquier punto.
- Sin `--d` propio, cada elemento entra con un retraso de `--fx-gap` por su orden.
- Por la API: `el_e1_text`, `el_e1_x`, `el_e1_y`, `el_e1_from` (bottom, top, left, right, center, fade, custom), `el_e1_fx`/`el_e1_fy` (origen si es custom), `el_e1_delay`, `el_e1_duration`, `el_e1_ease`, y también `color`, `bg`, `font`, `size`, `w`, `pad`. Si envías elementos `e1…e8`, sustituyen a los de muestra.
