# Catálogo de efectos

Fuente de verdad: archivos de texto (JSON/MD/CSS/JS). Sin base de datos y sin videos ni imágenes.
Los posts viven fuera del repo (`POSTS_DIR`); aquí solo se guardan **referencias** a ellos.

## Estructura
```
catalog/
  effects/<effect-id>/
    effect.json     metadatos (ver abajo)
    effect.md       cómo está hecho y cómo aplicarlo (lo que lee la IA)
    snippet.*       código aislado y reutilizable (opcional; si el código ya vive en un engine, se referencia en `source`)
  posts/<marca>/<post-id>.json     un registro por pieza, con los efectos que usa y en qué segundo
```

## effect.json
| campo | descripción |
|---|---|
| `id` | estable, igual al nombre de la carpeta (`slam`, `aga-iris`) |
| `name` | nombre legible |
| `kind` | `transition` \| `entrance` \| `text` \| `camera` \| `overlay` |
| `medium` | `video` \| `carousel` |
| `brands` | marcas donde existe el código |
| `tags` | palabras libres para buscar |
| `source` | dónde está el código: `{file, symbol}` (relativo a la raíz del repo) o, si solo existe dentro de una pieza, `{piece, symbol}` (relativo a `POSTS_DIR`); en ese caso el código vive también en `snippet.css` |
| `snippet` | archivo dentro de la carpeta del efecto (si lo hay) |
| `params` | parámetros ajustables y su significado |
| `audio` | sonido asociado y sincronía con `gen_audio.py` (o `null`) |

## post (catalog/posts/<marca>/<post-id>.json)
- `id`: ruta de la pieza bajo `POSTS_DIR` con `/` -> `-` (ej. `gmaq-noviembre-postVideo1`).
- `path`: esa ruta relativa a `POSTS_DIR`.
- `uses`: lista de `{effect, t, note}`; `t` en segundos. **El vínculo se escribe solo aquí.** Los posts de cada efecto se calculan a la inversa (no se duplican a mano).
- `thumb` (opcional): miniatura pequeña, nunca el video.

## Convenciones
- Un efecto = un movimiento o recurso visual distinto. Las variantes de dirección (`left`/`right`, `entrada`/`salida`, `kbl`/`kbr`) comparten efecto y se indican en `note`.
- Los efectos compuestos (`lower-third`, `goal-celebration`) se registran una vez, en el instante en que arrancan.
- `snippet.css` se extrae de una pieza real; si la pieza se retoca, el snippet no se actualiza solo.
- Los bucles (`infinite`) se registran en el segundo en que empieza su escena.
- Los usos de GREMCO y Pirotecnia se extrajeron con un script a partir de los `index.html`; no se revisaron viendo el video.
- `screen-shake` se registra una vez por cada instante de `HITS`/`hits`; suele coincidir con la entrada de un título.
- Los keyframes definidos pero sin usar en ninguna pieza (p. ej. `pulse`, `bob`, `float`, `spin` en GMAQ/AGA; `bob`, `bar`, `drift` en Pirotecnia) no se catalogan.

## Mantenerlo al día: `posts effect scan`
```
posts effect scan <pieza>            muestra qué efectos usa un video y en qué segundo, y qué cambiaría en el catálogo
posts effect scan <pieza> --write    crea/actualiza catalog/posts/<marca>/<id>.json
posts effect scan --all [--check]    revisa todos los videos; --check sale con error si el catálogo está desfasado
```
- Lee solo el `index.html` y usa `catalog/scan-map.json` (animación/clase → efecto). Si encuentra una animación que el mapa no conoce, la lista como `? animación sin catalogar`: crea su efecto en `catalog/effects/<id>/` y añádela al mapa.
- Lo que no se puede fechar automáticamente (p. ej. retrasos por elemento `var(--cs)`) se avisa como `? sin tiempo deducible`. Añade esos usos a mano en el JSON del post con `"manual": true`; el escáner los conserva y no los duplica.
- `--write` conserva las notas escritas a mano y los usos `manual`, y reemplaza el resto por lo detectado.
- Con carruseles no hace nada (no tienen animaciones).
