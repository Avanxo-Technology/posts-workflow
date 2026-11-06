# Aro de luz (GMAQ)
Transición "B" de GMAQ: un aro de 200 px (borde grueso cobre, y otro blanco más fino .05 s después) escala de 0 a 13 con fade en .65 s, junto a un flash. El comentario del código indica "aro de luz + la escena nueva se abre en círculo".

## Cómo aplicarlo
`<div class="ring" style="border:70px solid var(--copper-light);--s:<seg>s">` y un segundo aro blanco, más un `<div class="flash" style="--s:..">`.

## Notas
- Código real extraído de `gmaq/noviembre/postVideo2` (ver `snippet.css`); la definición canónica está en `gmaq/noviembre/postVideo2`.
- Los tiempos de index.html y gen_audio.py deben coincidir.
