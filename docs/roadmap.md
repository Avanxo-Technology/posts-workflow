# Hoja de ruta (no implementado)

## Publicar en redes sociales sin pasos manuales
Idea: que la IA, además de crear la pieza, la publique. Estado: NO existe; hoy las piezas terminan en `png/` o `reel.mp4` + `caption.txt` y se suben a mano.
Base ya lista: cada pieza tiene artefactos finales y caption.txt en rutas predecibles, y `posts check` valida tamaños, duración y audio.
Pasos previstos (a diseñar cuando se quiera avanzar; verificar requisitos vigentes de la API de cada red antes de empezar):
1. `posts publish <pieza> --network instagram` (o similar) que lea caption.txt y los archivos exportados.
2. Credenciales por marca fuera del repo (variables de entorno o gestor de secretos); nunca en brands/*.json ni en git.
3. Puerta de aprobación obligatoria: publicar solo piezas marcadas como aprobadas por el usuario (p. ej. un archivo `approved` en la pieza) y registrar
   qué se publicó, cuándo y dónde. Hasta que esto exista, la regla de AGENTS.md prohíbe publicar.
4. Otras redes (Facebook, TikTok, LinkedIn...) con el mismo comando y un adaptador por red.
