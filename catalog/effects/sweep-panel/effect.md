# Barrido de panel
Un panel de color cruza la pantalla. A mitad del recorrido la pantalla está cubierta: ahí se cambia la escena.

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza.
2. Añade `<div class="fx-sweep" style="--fx-delay:3.2s;--fx-duration:.8s">` encima de las escenas.
3. La escena siguiente debe empezar en `--fx-delay + --fx-duration / 2` (el punto marcado como «pantalla cubierta»). Pon el sonido de transición en `--fx-delay`.

## Notas
- El color usa por defecto el acento de la paleta; cámbialo con `--fx-color`.
