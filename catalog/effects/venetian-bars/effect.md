# Persianas (GMAQ)
Transición de GMAQ: 7 barras de color (cobre claro, grafito…) de 121 px que cierran la pantalla y la vuelven a abrir, escalonadas .03 s. Cada barra entra en `--s1` y sale en `--s2` (~.62 s después); la escena cambia mientras la pantalla está cubierta. Hay variante vertical (`bar v`) y horizontal (`bar h`). El tiempo de la nota es el `--s1` de la primera barra.

## Cómo aplicarlo
Dentro de `<div class="tr">` añade 7 `<div class="bar v" style="left:..;width:121px;background:..;--s1:..;--s2:..">`. El cambio de escena va entre `--s1` y `--s2`.

## Notas
- Código real extraído de `gmaq/noviembre/postVideo1` (ver `snippet.css`); la definición canónica está en `gmaq/noviembre/postVideo1`.
- Los tiempos de index.html y gen_audio.py deben coincidir.
