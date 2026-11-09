# Carruseles (1080x1350, HTML -> PNG)

Reglas del carrusel:
  - Láminas de 1080 x 1350 px. Normalmente 3 (no todos los posts necesitan 8 o 9).
  - Orden típico: 1) portada que atrapa, 2) contenido central, 3) contacto / llamada a la acción.
  - Cabecera mínima: el logo oficial de la marca o, si no hay, solo su nombre en texto.

Estilo: la pieza debe verse como un póster/anuncio profesional, NO como una página web.
  HACER:
  - Un objeto o foto protagonista grande, palabras gigantes (a veces detrás del objeto), mucha jerarquía tipográfica.
  - Fotos recortadas tipo sticker (borde blanco, rotación leve, sombra dura, cinta), globos de datos con líneas
    conectoras, sellos circulares, profundidad con sombras.
  - Contraste alto: fondos planos y saturados con texto muy legible. Textura sutil (grano / puntos de media tinta).
  - Inspiración: https://www.meigen.ai/?category=product y https://www.meigen.ai/?category=logo
  - Alternar fondos entre láminas (oscuro, claro, oscuro).
  EVITAR:
  - Tarjetas con bordes y sombras suaves, tablas, listas con cajas (se ve "web").
  - Grises apagados, textos pequeños, degradados que bajan el contraste.
  - Marcos que simulan la interfaz de Instagram. Redundancia en el encabezado (logo + nombre + "Maquinaria").
  - Repetir las mismas fotos en posts distintos si hay otras disponibles.

Estructura del HTML:
  - Un solo index.html con CSS dentro (sin librerías ni build). Fuentes por Google Fonts.
  - Cada lámina es <section class="slide"> de 1080x1350, position:relative, overflow:hidden; todo con
    position:absolute en píxeles.
  - Modo de revisión en todos los HTML: index.html muestra todas en fila (reducidas); index.html?s=2 muestra
    solo la lámina 2 a tamaño real. Código (al final del <body>):
        var s=new URLSearchParams(location.search).get('s');
        if(s){document.body.classList.add('single');
              document.querySelectorAll('.slide')[+s-1].classList.add('show')}
  - Fotos optimizadas a máx. ~1400 px en img/. Objetos que no existan en el sitio (calculadora, teléfono, recibo)
    se dibujan con CSS/SVG y, si son ejemplos, se marcan como "Ejemplo ilustrativo".

Plantilla mínima de index.html del carrusel (cambiar fuentes y colores por los de la marca, brands/<marca>.md):

    <!doctype html>
    <html lang="es"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Carrusel – TÍTULO</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap" rel="stylesheet">
    <style>
    :root{--c1:#0E1111;--c2:#F7F7F5;--acento:#C46A2B}
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#cfcdc4;font-family:Inter,system-ui,sans-serif}
    .board{display:flex;gap:40px;padding:40px;width:max-content;zoom:.42}
    body.single{background:#000}
    body.single .board{zoom:1;padding:0;gap:0}
    body.single .slide:not(.show){display:none}
    .slide{width:1080px;height:1350px;position:relative;overflow:hidden;flex:none}
    .dark{background:var(--c1);color:var(--c2)} .light{background:var(--c2);color:var(--c1)}
    </style></head><body>
    <div class="board">
      <section class="slide dark"><!-- 1 portada --></section>
      <section class="slide light"><!-- 2 contenido --></section>
      <section class="slide dark"><!-- 3 contacto / llamada a la acción --></section>
    </div>
    <script>
      var s=new URLSearchParams(location.search).get('s');
      if(s){document.body.classList.add('single');
            document.querySelectorAll('.slide')[+s-1].classList.add('show')}
    </script></body></html>

PNG: `posts export <pieza>` (una sola sesión de Chrome; ~3 s por carrusel). Después de generar, ABRIR los PNG y comprobar 1080x1350, sin textos cortados.
Extra opcional: resumen.txt en cada post (de qué trata, objetivo, estructura, diseño, pendientes por confirmar).
Conviene hacerlo siempre que haya datos por confirmar con el cliente.

Crear la carpeta: `posts new <marca> carousel --title "Tema"` (mes y número automáticos; deja index.html con la plantilla y colores de la marca).
Vista previa: `posts preview <pieza> N` (imprime la URL; --open la abre).
Revisar: `posts check <pieza>`.
