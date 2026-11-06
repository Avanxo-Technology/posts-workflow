# Wipe lima/navy
Un panel lima abre paso a un panel navy y luego ambos salen hacia la derecha; filo claro en el borde de ataque.

Se dibuja en el canvas `#cv-tr` por el motor de AGA (`brands/aga/_shared/engine.js`, función `wipe`); es función pura de `u` (0..1).

## Cómo aplicarlo
1. El video debe cargar `engine.js` (plantilla `brands/aga/_shared/video-template.html`).
2. En `VIDEO.trans` añade `{t0:<segundo>, dur:.9, type:'wipe'}`.
3. La escena siguiente debe empezar en el instante de swap (t0+.504); anótalo en el comentario.
4. En `gen_audio.py` pon el sonido (tr_wipe + tr_wipe2 (hit=True)) en el mismo `t0`. Los tiempos de index.html y gen_audio.py deben coincidir.
