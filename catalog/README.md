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

## UI: `posts catalog`
```
posts catalog [--port N] [--open]
```
Abre una página local (solo `127.0.0.1`, solo lectura, sin dependencias) con la galería de efectos, una demo en vivo de cada uno, su ficha y código, y en qué posts y segundos se usó. También hay vista por post con línea de tiempo. Los botones "Copiar prompt" generan una frase lista para pegar a Claude (por ejemplo: usa el efecto `slam` tal como se hizo en `gmaq-noviembre-postVideo1` en el segundo 0.3).
- Lee los JSON en cada recarga: lo que cambie `posts effect scan --write` o Claude se ve al pulsar "Recargar".
- La demo es automática para los efectos que tienen `@keyframes` en `snippet.css`, aplicados a una pieza de muestra con los colores de la marca. Los de motor JS/canvas (`aga-*`, `screen-shake`) usan un `demo.html` a medida con el código real del motor.
- Para una demo a medida pon un `demo.html` autocontenido en la carpeta del efecto; en `effect.json` puedes ajustar la demo automática con `"demo": {"duration": 2.4, "variants": ["kbin"]}`.

## Marcas desde la UI
En la pestaña **Marcas** de `posts catalog` se puede crear y configurar una marca sin tocar archivos:
- **Nueva marca**: lo mismo que `posts brand add` (comparten código en `_shared/brand-store.mjs`).
- **Identidad y contacto**: nombre, colores, fuentes de Google Fonts, WhatsApp, correo, web. En marcas generadas con `brand add` (`"generated": true` en su JSON) puede regenerar `brands/<id>/_shared/video-template.html`; en las marcas con plantilla hecha a mano no la toca.
- **design.md**: se sube o se pega y se guarda en `brands/<id>/design.md`. Si existe, `posts brand show` y la IA usan este en vez de la ruta externa `designFile`.
- **Notas** (`brands/<id>.md`): contacto, caption de cierre, reglas.
- **Logos**: PNG/JPG/WEBP/SVG simple (2 MB máx.) en `brands/<id>/logos/`.
- **Vista previa en vivo** con la paleta, las fuentes y el logo.

Seguridad: las escrituras exigen un token de sesión y solo aceptan peticiones de `127.0.0.1`. Se rechaza todo texto que parezca una clave o token, los SVG con scripts y los archivos cuyo contenido no coincide con su tipo. La UI no hace commit ni push: los cambios quedan en el clon local.
Todo el acceso a las marcas pasa por `createFileStore()`; para mover las marcas a una base de datos bastaría con sustituir ese módulo.

## Contrato de efecto (spec 1) y API para agentes
Un efecto «spec 1» (`"spec": 1` en su `effect.json`) es un módulo portable y parametrizado, pensado para editarse en la UI y para que un agente lo consuma:
- `fx.css`: keyframes y clases con prefijo `fx-` que leen **variables CSS** `--fx-*` (con valor por defecto en el propio CSS). Nada de colores ni tiempos fijos.
- `fx.html`: el marcado de uso. Lleva `{{vars}}` donde van las variables en línea; el contenido de ejemplo se marca con `data-fx-sample`/`data-fx-scene` o se envuelve en `<!--fx-demo-->…<!--/fx-demo-->` y se elimina al exportar.
- `effect.json` → `fx.params`: parámetros tipados. `number` (unit, min, max, step), `color` (hex o `palette.dark|light|accent`) y `enum` (cada opción puede fijar variables propias con `vars`). Cada parámetro `x` se convierte en `--fx-x`. Convención: `duration` y `delay` en segundos; `delay` es el segundo del video en que empieza.
- `fx.markers`: instantes clave como fracción de la duración (p. ej. la pantalla cubierta de una transición).
- Los efectos funcionan por tiempo (animaciones CSS que se pueden pausar y mover con `seek`), así que sirven para renderizar video.
- `_shared/catalog-ui/fx-core.js` valida y genera el código; lo usan la UI, la API y las pruebas (`node --test _shared/fx-core.test.mjs`). `posts effect check` comprueba que cada parámetro se use en el CSS.

Migrados a spec 1: `slam`, `pop`, `scene-push`, `sweep-panel` e `iris-reveal`. Los demás siguen en el formato anterior y se irán migrando.

**API (solo lectura)** — la sirve `posts catalog`; el mismo formato servirá el sitio público:
- `GET /llms.txt`: instrucciones para agentes.
- `GET /api/v1/effects?kind=&brand=&tag=&q=`: lista.
- `GET /api/v1/effects/<id>?duration=0.6&delay=2&palette=gmaq`: ficha con `params`, `values`, `code.css`, `code.html`, `vars`, `markers` y `totalSeconds`. Los valores fuera de rango devuelven 400 con el detalle.
La UI guarda los valores en la URL (`#/efecto/slam?duration=1.5&palette=gmaq`), así que una configuración se puede compartir.

## Kit (carrito)
En la pestaña **Kit** de `posts catalog` se reúnen varios efectos spec 1 para usarlos en una misma pieza. Se añaden desde la ficha de cada efecto («+ Añadir al kit») con los valores que tenga en ese momento.
- **Línea de tiempo**: un bloque por efecto. Arrastrar el bloque cambia su inicio (`delay`) y estirar su borde derecho cambia su `duration`. Las marcas blancas son los marcadores del efecto. Pulsar en la regla mueve la vista previa a ese instante.
- **Cada elemento** tiene su texto, todos sus parámetros, y se puede subir/bajar (orden de apilado: el último queda encima), duplicar o quitar.
- **Paleta** del kit: una marca o colores propios. Todo se guarda en el navegador (`localStorage`); no hay cuentas.
- **Paquete**: copiar CSS + HTML ya compuestos, descargar `kit.html` (página autónoma con reproductor; `?t=<seg>` congela un instante y `?rec=1` oculta los controles), copiar el JSON o copiar el enlace del kit (`#/kit?k=…`, que al abrirse carga el kit).
- Los elementos de tipo texto van en contenedores `.kit-slot` de ejemplo (posiciones y estilo de muestra que se sustituyen por el diseño real); las transiciones con escenas cubren la pantalla, así que en una pieza real se aplican entre tus propias escenas.

**API del kit** (para agentes), con `k` = el valor del enlace del kit:
- `GET /api/v1/kit?k=<kit>`: JSON con `items[]` (inicio, duración, marcadores y HTML de cada uno), `code.css`, `code.html`, `markers` y `howTo`. Un kit no válido devuelve 400 con el detalle.
- `GET /api/v1/kit?k=<kit>&format=html`: la página autónoma (con política de seguridad restrictiva).
Solo admiten efectos spec 1 (parametrizados) y hasta 40 elementos. Las etiquetas se escapan siempre.
