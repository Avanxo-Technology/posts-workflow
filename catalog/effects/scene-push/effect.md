# Empuje de escena
La escena nueva entra empujando a la anterior, que se desplaza un poco (efecto de paralaje). Es la transición básica entre fotos en los reels de GREMCO.

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza.
2. Coloca las dos escenas dentro de `.fx-push`: la saliente con `fx-push-out` y la entrante con `fx-push-in`, ambas con las mismas variables (`--fx-delay` = segundo en que empieza el empuje).
3. La dirección se controla con `--fx-dx`/`--fx-dy` (1,0 = entra desde la derecha).

## Notas
- La escena saliente debe seguir visible mientras dura el empuje: haz que su `--d` termine al menos en `--fx-delay + --fx-duration`.
- Equivale a los antiguos `--in:inPush` / `--out:outPush` de las plantillas de GREMCO.
