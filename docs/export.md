# Exportar, caption y calidad

## Comandos
  posts export <carrusel>                  PNG 1080x1350 en <pieza>/png (una sola sesión de Chrome)
  posts export <carrusel> 2                solo la lámina 2
  posts export <carrusel> --out DIR        escribe en otra carpeta (vista previa sin pisar los definitivos)
  posts export <video> --yes               reel.mp4 (SOLO cuando el usuario lo indique; sin --yes no graba; tarda minutos)
                                           con sonido según piece.json; --sound on|off lo fuerza
  posts export <video> --frame 2.5 f.png   un fotograma de revisión (no toca reel.mp4)
  posts check <pieza>                      validaciones automáticas
Ante un cambio posterior a un export, avisar que los PNG/MP4 quedaron desactualizados (`posts check` lo detecta).

## Qué verifica `posts check` solo
  carrusel: láminas en HTML = PNG, dimensiones 1080x1350, PNG más viejos que index.html, rutas relativas rotas, caption (vacío, **markdown**, 8-13 hashtags).
  video:    TOTAL del HTML = TOTAL de gen_audio.py = duración de sfx.wav = duración de reel.mp4, 1080x1920, 30 fps, audio AAC,
            reel.mp4/sfx.wav desactualizados, rutas rotas, textos de plantilla sin cambiar.
  Lo que NO puede verificar (revisión humana/visual): textos cortados o montados, calidad del diseño, veracidad de datos y contacto.

## Caption (caption.txt)
  - Primera línea: gancho con 1-2 emojis (pregunta o afirmación fuerte).
  - Cuerpo corto: resume lo que dicen las láminas/escenas, con viñetas y emojis (✅ 1️⃣ ⛔ ⏱️ 📖).
  - Llamada a la acción con enlace (diagnóstico, artículo, catálogo, calculadora...). En video: "Guarda y comparte" si aplica.
  - Bloque de contacto: 📲 WhatsApp · ✉️ correo · 🌐/📖 web · 📍 ciudad (según marca).
  - 8-13 hashtags al final (marca + tema + ciudad/país). En videos se añade #Reels.
  - Texto plano (Instagram no muestra negritas): sin **markdown**.
  - Debe coincidir EXACTO con lo que dicen las láminas/escenas y con los datos del sitio.
  - Marcas con tono propio: GREMCO cierra con su lema; Pirotecnia añade el aviso de uso solo para adultos.

## Checklist de calidad
Contenido
  [ ] Todo sale del sitio real de la marca o de material que dio el usuario; ningún dato inventado.
  [ ] Cifras de ejemplo marcadas como "Ejemplo ilustrativo" o sin cifras.
  [ ] Sin promesas no verificadas (ej. "respondemos en menos de 12 horas"): el cliente pidió quitarlas.
  [ ] Contactos y dominio correctos (brands/<marca>.md).
  [ ] Fechas, horarios y lugares de eventos coinciden con el artículo/flyer/fuente.
  [ ] Si hay un flujo real (diagnóstico de AGA), se probó y se copiaron su interfaz y textos reales.
  [ ] Datos pendientes de confirmar quedaron anotados (resumen.txt o respuesta al usuario).
Diseño (carrusel y video)
  [ ] Sin número de lámina. Cabecera mínima. Tipografía de la marca.
  [ ] Ningún texto cortado en los bordes ni montado sobre otro.
  [ ] Espaciado parejo en listas (misma altura y aire arriba/abajo en cada fila).
  [ ] Contraste suficiente. Fotos y logos nítidos. Ninguna foto repetida sin necesidad.
  [ ] Elementos cuyo recorte importa (círculos "VS", sellos) no quedan tapados por un contenedor con overflow:hidden.
Video
  [ ] Los tiempos de index.html y gen_audio.py coinciden (cortes de escena y golpes).
  [ ] TOTAL (index.html) = TOTAL (gen_audio.py) = duración de sfx.wav = duración de reel.mp4.
  [ ] Se revisaron fotogramas de cada escena y de cada transición con render --frame.
  [ ] Texto del cierre dentro de la zona segura; contacto legible al menos 2 s.
  [ ] Los clips del cliente se ven completos, sin estirar, y no se repiten.
Entrega
  [ ] PNG 1080x1350 o reel.mp4 1080x1920 generados SOLO cuando se pidió/aprobó.
  [ ] caption.txt coincide con la pieza.
  [ ] Se avisó qué quedó desactualizado si hubo cambios después de generar.
