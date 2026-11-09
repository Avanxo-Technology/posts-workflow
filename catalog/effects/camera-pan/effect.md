# Paneo de cámara
Desplazamiento horizontal de la imagen: `kbl`/`kbr` (±3 % con zoom 1.14), `pan` (banda panorámica que se desplaza 260 px) y `panx` (`object-position` de 0 a 100 %).

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. Sustituye el `<div class="fx-pan-media">` por tu `<img>` o `<video>` con la misma clase.

## Notas
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek`.
