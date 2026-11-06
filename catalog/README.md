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
