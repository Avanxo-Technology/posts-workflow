# Slam
Texto o elemento que entra desde abajo, más grande, rebota un poco y se asienta. Es la entrada "de impacto" para títulos y cifras grandes.
Sus variantes `slamL` y `slamR` hacen lo mismo entrando desde la izquierda o la derecha.

## Cómo aplicarlo
1. Verifica que el `index.html` tenga la clase `.k` y el `@keyframes slam` (vienen en `video-template.html`; si no, copia `snippet.css`).
2. En el elemento: `class="abs k"` y `style="--n:slam;--s:<segundo>s;--t:<duración>s"`.
3. Añade el sonido en `gen_audio.py` en el mismo segundo `--s`.

## Notas
- Las 6 copias revisadas (4 plantillas + posts de GMAQ) son idénticas.
- Las animaciones son función del tiempo (el reproductor las pausa y mueve con `seek`), así que no usa JS.
