# Video de referencia (inspiración para transiciones y ritmo)

El usuario puede pasar un video real (.mp4) para inspirar las transiciones o el ritmo de la pieza. El video se usa SOLO como referencia de movimiento:
no se copian sus imágenes, textos ni sonidos; la pieza usa el material y la marca del usuario.

## Cómo estudiarlo (la IA debe MIRAR las imágenes que genera el CLI)
1. `posts analyze <video.mp4>` -> resumen (resolución, fps, duración, si tiene audio, cortes bruscos) e `overview.png` (10 fotogramas repartidos).
   Las imágenes quedan en `<posts>/_refs/<nombre>/` (o en `--out DIR`). Mirar `overview.png` para ver la secuencia de escenas y el estilo.
2. Localizar los cambios de escena en el overview y pedir el tramo: `posts analyze <video.mp4> --from 4.2 --to 5.4` -> `window_*.png` con un
   fotograma cada 0.2 s. Ahí se ve CÓMO es la transición (qué entra, desde dónde, cuánto dura, qué color).
   La detección automática de cortes solo atrapa cortes bruscos; las transiciones animadas casi nunca se detectan: por eso se mira el tramo.
3. Anotar por cada transición: tipo, dirección, duración (s), colores, si hay flash/sacudida y qué sonido la acompaña (si se conoce).

## Traducir lo observado al CSS de la plantilla (tiempos absolutos, todo función de t)
| Se ve en la referencia | Cómo se hace |
|---|---|
| Panel de color que barre la pantalla y revela la escena nueva | `.sw` + `@keyframes swp` en video-template.html (cubre del todo en `--s`+0.4 s; cambiar escena en ese instante) |
| Persianas verticales u horizontales | varias franjas `scaleY`/`scaleX` escalonadas (ver el efecto `venetian-bars` del catálogo) |
| Círculo que abre o cierra (iris) | `clip-path: circle()` animado + aro de luz (`.ring`) |
| Empuje lateral/vertical de la escena | `translateX/Y` de la escena entrante y saliente (ver los efectos `scene-push` y `scene-up` del catálogo) |
| Zoom de entrada/salida | `scale()` con opacidad (`inZoom`/`outZoom`) |
| Destello blanco / sacudida | `.flash` + lista HITS (el reproductor sacude la pantalla en esos segundos) |
| Corte seco | sin transición: `--s` de la escena siguiente = fin de la anterior |
Usar siempre delays absolutos (`--s`) y `animation-fill-mode: both`: nada de setTimeout. Si la transición es nueva, definirla en el CSS del video.
Una transición que se vaya a reutilizar entre videos de la marca puede añadirse a la plantilla de la marca (brands/<marca>/_shared/video-template.html).

## Sonido de la transición
Si el video tiene sonido y el usuario quiere sonido propio: hacer el efecto con la paleta de la marca (docs/audio.md), con los mismos segundos que la animación.
Si el usuario eligió video sin sonido (`posts sound <video> off`), ignorar el audio de la referencia.

## Preguntar al usuario
Qué le gusta de la referencia (las transiciones, el ritmo, el tipo de texto), si hay que imitarla fielmente o solo inspirarse, y dónde está el archivo.
