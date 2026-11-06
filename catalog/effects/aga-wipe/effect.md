# Wipe lima/navy
Un panel lima abre paso a un panel navy y luego ambos salen hacia la derecha; filo claro en el borde de ataque.

Se dibuja en el canvas `#cv-tr` por el motor de AGA (`brands/aga/_shared/engine.js`, función `wipe`); es función pura de `u` (0..1).

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. Colócalo encima de las escenas; cambia la escena en el marcador. Pon `tr_wipe` en `--fx-delay` y `tr_wipe2` (con `hit=True`) medio segundo después.

## Notas
- Reimplementación en CSS de la transición `wipe` del motor de AGA (`engine.js`), con colores y duración configurables. No incluye el filo claro del borde de ataque.
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek`.
