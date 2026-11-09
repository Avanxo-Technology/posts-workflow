# Slam
Texto o elemento que entra desde abajo, más grande, rebota un poco y se asienta. Es la entrada «de impacto» para títulos y cifras grandes.
Sus variantes laterales están en `slam-sides`.

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Añade la clase al elemento y fija los parámetros como variables en su `style`: `<h1 class="fx-slam" style="--fx-delay:.3s;--fx-duration:.8s">`.
3. `--fx-delay` es el segundo del video en que entra el elemento. Sincroniza el sonido en ese mismo segundo (un golpe fuerte si debe sacudir la pantalla).

## Notas
- Funciona por tiempo: es una animación CSS que el reproductor puede pausar y mover con `seek`; no usa JS.
- Los parámetros están en `effect.json` → `fx.params`.
