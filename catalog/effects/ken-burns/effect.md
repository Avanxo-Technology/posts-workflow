# Zoom lento (Ken Burns)
Zoom muy lento sobre fotos o videos fijos: `kb` (1.02 a 1.2), `kbin` (1 a 1.16), `kbout` (1.16 a 1) y `vslow` (1 a 1.07, para clips de video).

## Cómo aplicarlo
Imagen/video con `animation:var(--kb,kbin) calc(var(--d) + .6s) linear var(--s) both`.

## Notas
- Código real extraído de `gremco/noviembre/reel1` (ver `snippet.css`); la definición canónica está en `_shared/base/video-template.html`.
- Los tiempos de index.html y gen_audio.py deben coincidir.
