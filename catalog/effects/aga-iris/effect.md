# Iris circular
Un círculo navy (con núcleo lima y aro claro) crece hasta cubrir la pantalla y luego se abre un agujero circular que revela la escena nueva.

Se dibuja en el canvas `#cv-tr` por el motor de AGA (`brands/aga/_shared/engine.js`, función `iris`); es función pura de `u` (0..1).

## Cómo aplicarlo
1. El video debe cargar `engine.js` (plantilla `brands/aga/_shared/video-template.html`).
2. En `VIDEO.trans` añade `{t0:<segundo>, dur:.9, type:'iris'}`.
3. La escena siguiente debe empezar en el instante de swap (~t0+.45); anótalo en el comentario.
4. En `gen_audio.py` pon el sonido (tr_iris) en el mismo `t0`. Los tiempos de index.html y gen_audio.py deben coincidir.
