# Marca: aga

AGA — asesoría financiera, tributaria y empresarial para pymes, Barranquilla
  Proyecto:   /home/guarapo/gosites/aga-growth-website  (DESIGN.md en la raíz). Sitio https://aga-growth.com
              (artículos en /noticias, herramienta en /diagnostico-financiero-empresarial).
  Tipografía: solo Inter (títulos 700-900 en carruseles y 900 en videos, interletrado muy negativo -.06em, interlineado ~.82-.9).
  Colores:    navy #0B2938, lima #A8CB18 (acento), papel #F4F0E7, sage #879E91, dorado #B28A35. Rojo #C4452F SOLO para
              estados de semáforo. Fondos: alternar navy y papel. NO usar fondo lima completo. Texto lima sobre papel: #8fb010.
  Logo:       "AGA Growth Advisors" (blanco para fondos oscuros: img/logo-white.png; oscuro para claros: logo-dark.png).
  Ilustraciones del sitio: brújula con objetos financieros (hero-home.png), líneas de "señales" (senales-*.webp),
              foto de formularios (blog-hero.webp).
  Contacto:   WhatsApp +57 320 478 4126 | info@aga-growth.net | aga-growth.com | Carrera 64B #85-180, Of. 202, Barranquilla.
              Dos dominios (.com web / .net correo): está así en el sitio; confirmar con el cliente si hay duda.
  Video:      sistema visual en _shared/aga.css; transiciones lima/navy (wipe, bars, iris); pastillas lima, hoja con ✓ lima.

RECURSOS (piezas nuevas)
  aga/_shared/: engine.js (motor), aga.css (sistema visual), sfxlib.py, fetch_sfx.py, sfx/ (48 efectos, incluidos en el repo), CREDITOS-SONIDO.txt (la música music/ es opcional y no se versiona),
  video-template.html, gen_audio.template.py. (aga/noviembre/_shared es la copia ANTIGUA que usan los videos ya hechos.)
  Sonido: efectos REALES + música con ducking (docs/audio.md, enfoque A). Transiciones lima/navy en canvas (wipe, bars, iris).
  Los logos viven en el img/ de cada video (posts new aga video copia los del último video).
DISEÑO: /home/guarapo/gosites/aga-growth-website/DESIGN.md
PIEZAS EXISTENTES: carruseles octubre/post1-3; videos noviembre/postVideos/postVideo1 y 2 (estructura modelo).

Configuración leída por el CLI: brands/aga.json (fuentes, colores base, archivo de diseño).
