# Persianas alternas
8 persianas horizontales que entran y salen alternando sentido (derecha/izquierda) y color (lima/navy), con un pequeño desfase entre ellas.

Se dibuja en el canvas `#cv-tr` por el motor de AGA (`brands/aga/_shared/engine.js`, función `bars`); es función pura de `u` (0..1).

## Cómo aplicarlo
1. El video debe cargar `engine.js` (plantilla `brands/aga/_shared/video-template.html`).
2. En `VIDEO.trans` añade `{t0:<segundo>, dur:.9, type:'bars'}`.
3. La escena siguiente debe empezar en el instante de swap (~t0+.52); anótalo en el comentario.
4. En `gen_audio.py` pon el sonido (tr_bars) en el mismo `t0`. Los tiempos de index.html y gen_audio.py deben coincidir.
