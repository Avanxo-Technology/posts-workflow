# Doble barrido
Un panel abre paso a un segundo panel de otro color y luego ambos salen hacia la derecha.

Es una transición de pantalla completa: función pura del tiempo normalizado `u` (0..1).

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. Colócalo encima de las escenas; cambia la escena en el marcador. Sincroniza el sonido con `--fx-delay` y un segundo golpe medio segundo después.

## Notas
- Colores y duración configurables.
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek`.
