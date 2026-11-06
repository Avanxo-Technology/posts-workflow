# Aro de luz (GMAQ)
Transición "B" de GMAQ: un aro de 200 px (borde grueso cobre, y otro blanco más fino .05 s después) escala de 0 a 13 con fade en .65 s, junto a un flash. El comentario del código indica "aro de luz + la escena nueva se abre en círculo".

## Cómo aplicarlo
1. Copia `fx.css` en el CSS de la pieza (una sola vez).
2. Usa el marcado de `fx.html` y fija los parámetros como variables en su `style`; `--fx-delay` es el segundo del video en que empieza.
3. Colócalo encima de las escenas. Pon un golpe de audio en `--fx-delay`.

## Notas
- Origen: transición «B» de GMAQ (`postVideo2`): aro de luz y flash.
- Los parámetros y sus rangos están en `effect.json` → `fx.params`. Es CSS puro por tiempo: se puede pausar y mover con `seek`.
