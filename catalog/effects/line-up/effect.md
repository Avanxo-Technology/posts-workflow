# Línea que sube (máscara)
Cada línea del titular vive en un contenedor `.clip` (overflow hidden) y su `span` sube desde 115% con fade, como si saliera de detrás de una máscara. Es el estilo de los titulares de AGA.

## Cómo aplicarlo
`<div class="giant g1 clip"><span class="k" style="--n:lineUp;--s:<seg>s;--t:.6s">Texto</span></div>`.

## Notas
- Código real extraído de `/home/guarapo/tools/posts-workflow/brands/aga/_shared/aga.css` (ver `snippet.css`); la definición canónica está en `brands/aga/_shared/aga.css`.
- Los tiempos de index.html y gen_audio.py deben coincidir.
