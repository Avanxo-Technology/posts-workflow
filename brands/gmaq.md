# Marca: gmaq

GMAQ — alquiler de maquinaria pesada, Barranquilla
  Proyecto:   /home/guarapo/gosites/gmaq  (sitio local localhost:8000, página /equipos; artículos del blog)
  Tipografía: Montserrat (títulos 800-900, mayúsculas, interletrado negativo) + Inter (texto).
  Colores:    cobre #C46A2B (principal; el sitio usa #B05E22 como --copper), cobre oscuro #9E4F1A, grafito #0E1111,
              crema #F7F7F5, durazno #F0A06A (acento sobre oscuro).
  Marca:      texto "GMAQ" arriba a la izquierda (sin logo "G" ni sufijos). Letra 34 px, interletrado .16em, mayúsculas.
  Contacto:   WhatsApp +57 301 365 8759 | Tel. +57 314 674 4426 | info@gmaquinarias.com | gmaquinarias.com
              (el dominio es gmaquinarias.com; "g-maquinarias.com" fue un error ya corregido).
  Fotos:      catálogo en /equipos (varias fotos por máquina; usar tomas distintas).
  Blog:       gmaquinarias.com/articulos

RECURSOS (piezas nuevas)
  gmaq/_shared/: synth.py (sonido sintetizado), video-template.html, gen_audio.template.py, README.txt.
  Render y exportador de carruseles: posts/_shared (únicos para todas las marcas).
  Sonido: SINTETIZADO, sin música (docs/audio.md, enfoque C). Clips reales verticales en img/*.mp4; el clip protagonista va a pantalla completa.
DISEÑO: gmaq/MEMORY.md, gmaq/ARCHITECTURE.md y gmaq/static/css/styles.css (no hay DESIGN.md).
PIEZAS EXISTENTES: carruseles octubre/post1 (9 láminas), post2, post3; videos noviembre/postVideo1 y postVideo2 (directo bajo el mes, estructura antigua).

Configuración leída por el CLI: brands/gmaq.json (fuentes, colores base, archivo de diseño).
