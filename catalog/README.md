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
| `id` | estable, igual al nombre de la carpeta (`slam`, `iris-reveal`) |
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
- `id`: ruta de la pieza bajo `POSTS_DIR` con `/` -> `-` (ej. `carbon-noviembre-postVideo1`).
- `path`: esa ruta relativa a `POSTS_DIR`.
- `uses`: lista de `{effect, t, note}`; `t` en segundos. **El vínculo se escribe solo aquí.** Los posts de cada efecto se calculan a la inversa (no se duplican a mano).
- `thumb` (opcional): miniatura pequeña, nunca el video.

## Convenciones
- Un efecto = un movimiento o recurso visual distinto. Las variantes de dirección (`left`/`right`, `entrada`/`salida`, `kbl`/`kbr`) comparten efecto y se indican en `note`.
- Los efectos compuestos (`lower-third`, `goal-celebration`) se registran una vez, en el instante en que arrancan.
- `snippet.css` se extrae de una pieza real; si la pieza se retoca, el snippet no se actualiza solo.
- Los bucles (`infinite`) se registran en el segundo en que empieza su escena.
- Los usos registrados se extraen con un script a partir de los `index.html`; no se revisan viendo el video.
- `screen-shake` se registra una vez por cada instante de `HITS`/`hits`; suele coincidir con la entrada de un título.
- Los keyframes definidos pero sin usar en ninguna pieza (p. ej. `pulse`, `bob`, `float`, `spin`) no se catalogan.

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
Abre una página local (solo `127.0.0.1`, solo lectura, sin dependencias) con la galería de efectos, una demo en vivo de cada uno, su ficha y código, y en qué posts y segundos se usó. También hay vista por post con línea de tiempo. Los botones "Copiar prompt" generan una frase lista para pegar a Claude (por ejemplo: usa el efecto `slam` tal como se hizo en `carbon-noviembre-postVideo1` en el segundo 0.3).
- Lee los JSON en cada recarga: lo que cambie `posts effect scan --write` o Claude se ve al pulsar "Recargar".
- La demo es automática para los efectos que tienen `@keyframes` en `snippet.css`, aplicados a una pieza de muestra con los colores de la marca. Los de motor JS/canvas usan un `demo.html` a medida.
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

Todos los efectos del repo (39) están en spec 1. Los efectos con varias piezas (p. ej. `lower-third`, `venetian-bars`) y los envoltorios (`screen-shake`) también cumplen el contrato.

Campos opcionales de `fx` para los casos complejos:
- `total`: fórmula del tiempo total cuando no es `delay + duration` (p. ej. `"delay + duration * count"`). Solo admite números, nombres de parámetros, `+ - * /` y paréntesis; no ejecuta código.
- `markers[].expr`: marcador como fórmula en segundos (en vez de `at`, fracción de la duración).
- `{{content}}` en `fx.html`: el efecto es un **envoltorio** (como la sacudida) y rodea al resto del contenido; en un kit envuelve a todos los demás elementos.
- `{{label}}` y `fx.label`: el texto editable del elemento.
- Todos los nombres de clase y de `@keyframes` llevan el prefijo `fx-<efecto>` y no pueden repetirse entre efectos (lo comprueban las pruebas), para que un kit pueda juntarlos.

**API (solo lectura)** — la sirve `posts catalog`; el mismo formato servirá el sitio público:
- `GET /llms.txt`: instrucciones para agentes.
- `GET /api/v1/effects?kind=&brand=&tag=&q=`: lista.
- `GET /api/v1/effects/<id>?duration=0.6&delay=2&palette=oceano`: ficha con `params`, `values`, `code.css`, `code.html`, `vars`, `markers` y `totalSeconds`. Los valores fuera de rango devuelven 400 con el detalle.
La UI guarda los valores en la URL (`#/efecto/slam?duration=1.5&palette=oceano`), así que una configuración se puede compartir.

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

## Elementos de muestra editables
Un efecto puede marcar sus elementos de muestra en `fx.html`: `data-fx-sample` (texto de muestra, con `{{label}}`), `data-fx-scene="a|b"` (escenas) y `data-fx-media` (foto o video). Las escenas dentro de `<!--fx-demo-->…<!--/fx-demo-->` solo existen en la vista previa.
- **Texto, color del texto, fondo y tamaños** (`el_text`, `el_color`, `el_bg`, `el_size` = tamaño del texto en px, `el_w` = ancho del elemento en %, `el_pad` = relleno en px; `el_a_*` / `el_b_*` para las escenas, que admiten texto, colores y tamaño del texto) **sí cambian el código**: se aplican como `style` inline del elemento. Valen en la URL de la UI, en la API (`/api/v1/effects/<id>?el_text=Hola&el_bg=%23112233`) y en el kit.
- **La imagen** que el visitante pone en un elemento es **solo para la vista previa**: vive en memoria, no se guarda ni viaja en enlaces, kit, API ni código.
- **El código no se ata a una etiqueta**: el elemento de muestra sale como `<div>` con un comentario («aplica esta clase y el style a TU elemento»); `h1`, `h2`, `section`… del fx.html solo se usan en la vista previa. Las escenas del código salen como `<div>` con `<!-- tu escena A -->`.
- `FX.elementsOf(efecto)` lista los elementos editables y `FX.cleanElements` valida lo que llega de fuera (hex o `palette.*`, texto de hasta 80 caracteres, tamaño del texto de 10 a 600, ancho de 10 a 100, relleno de 0 a 300).

## Comprobar que los efectos se ven y se mueven
`node _shared/site/qa-effects.mjs [id …] [--out carpeta]` renderiza cada efecto en Chrome, toma fotogramas en varios instantes y mide cuánto cambia la imagen. Marca como **SIN MOVIMIENTO VISIBLE** los que no cambian de forma perceptible (p. ej. un degradado liso que se desplaza) y como **NO SE VE NADA** los que no dibujan contenido. Con `--out` guarda los fotogramas como PNG para revisarlos. Requiere Chrome. Córrelo tras crear o cambiar un efecto.

## Sitio público (`posts site build`)
El sitio es lo que usa el visitante; GitHub guarda la fuente y publica. `posts site build [--out dist] [--base https://mi-sitio.com]` genera una carpeta lista para publicar (se ignora en git):
- `public/`: la UI (sin el editor de marcas), los datos del catálogo, las miniaturas, `llms.txt` y la API con **valores por defecto** como archivos (`api/v1/effects.json`, `api/v1/effects/<id>.json`).
- `functions/`, `netlify/`, `lib/`: la **función** que responde a `/api/v1/*` y `/llms.txt` con valores a medida (`?duration=0.6&palette=oceano`) y a los kits (`/api/v1/kit?k=…`). Un hosting solo estático no puede calcular eso; sin la función, el agente solo obtiene los valores por defecto.
- Sin `--base`, las URL de los JSON estáticos son relativas (`/api/v1/effects/slam`); con `--base`, absolutas. La función siempre usa el origen real de la petición.
- La lógica de la API es **una sola** (`_shared/site/api-core.mjs`, estándares web `Request`/`Response`): la usan `posts catalog`, la función desplegada y la generación de los JSON, así que lo que pruebas en local es lo que se publica.
- `posts site serve [--dir dist]` lo sirve en local emulando el hosting (un archivo estático tiene prioridad sobre la función, como en Cloudflare/Netlify).
- Adaptadores incluidos: **Cloudflare Pages Functions** y **Netlify Functions**. Se verifican en las pruebas cargándolos desde la carpeta generada, pero **no se han desplegado en una plataforma real**.
- `build` no pisa una carpeta que no sea un build anterior (lleva un marcador `.posts-site-build`).
- **Versión pública sin marcas**: el build solo publica los efectos spec 1 (`_shared/site/public.mjs`), sin `source`, `brands`, `uses`, posts ni `catalog/posts`, con las paletas neutras de `catalog/palettes.json` (en lugar de las de las marcas) y sin las viñetas de «## Notas» que cuentan el origen interno. Si queda cualquier rastro de una marca, una ruta del repo o un post, **el build falla** y dice en qué efecto. Al añadir un efecto, no nombres marcas fuera de «## Notas» ni pongas marcas en `name` ni `tags`.
- La UI pública no muestra marcas ni posts; permite ajustar tiempos y colores, **guardar configuraciones** (`#/guardadas`, en el navegador) y usar el **kit** con enlace para Claude.
- Lo que se publica de cada post son referencias (ids, rutas relativas y segundos), nunca videos ni imágenes ni rutas locales (lo comprueban las pruebas).

**Integración continua** (`.github/workflows/site.yml`): en cada push y PR corre las pruebas, `effect check`, el build y una prueba de humo contra el emulador, y guarda el sitio como artefacto. La publicación en un hosting está **comentada**: hace falta elegir proveedor y crear sus secretos en GitHub.
