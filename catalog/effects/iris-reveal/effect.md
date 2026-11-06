# Iris (apertura circular)
Una cortina circular: el círculo se cierra hasta cubrir la pantalla y luego se abre revelando la escena nueva (o solo una de las dos fases). Reimplementación genérica en CSS de `aga-iris`, sin canvas y con colores y centro configurables.

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza.
2. Añade `<div class="fx-iris" style="--fx-delay:4.3s;--fx-duration:.9s">` encima de las escenas.
3. En el modo «cierra y abre», la pantalla queda cubierta a mitad de la duración: la escena siguiente debe empezar ahí. Sincroniza el sonido con `--fx-delay`.

## Notas
- Usa `@property` para animar el radio: funciona en Chrome/Edge 85+, Safari 16.4+ y Firefox 128+ (incluido el Chrome con el que se graba el video).
- `aga-iris` sigue existiendo: es el original en canvas del motor de AGA, con sus colores fijos.
