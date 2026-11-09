# Zoom lento (Ken Burns)
Zoom muy lento sobre fotos o videos fijos: `kb` (1.02 a 1.2), `kbin` (1 a 1.16), `kbout` (1.16 a 1), `vslow` (1 a 1.07, para clips de video) y `kenIn` (1.04 a 1.22 con desplazamiento).

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. Sustituye el `<div class="fx-kb-media">` por tu `<img>` o `<video>` con la misma clase. Pon en `--fx-duration` algo más que lo que dura la escena.

## Notas
- Reúne los antiguos `kb`, `kbin` (1 → 1.16), `kbout` (1.16 → 1; invierte `from`/`to`), `vslow` (1 → 1.07) y `kenIn` (AGA).
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek`.
