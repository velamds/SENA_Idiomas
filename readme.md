# SENA Idiomas

Índice de las lecciones de idiomas del SENA publicadas en GitHub Pages: https://velamds.github.io/SENA_Idiomas/

Cada lección vive en su propio repositorio (por ejemplo `Ingles_General_A1_1_01`). Este repositorio solo tiene el índice:

- `catalogo.json`: idiomas → programas → niveles → lecciones → objetos. Se genera con `publicador/catalogo.py` a partir de `publicados.tsv` y de los `imsmanifest.xml` de cada objeto.
- `index.html`, `estilos.css`, `app.js`: la página, que lee `catalogo.json`.

Para agregar un programa o un idioma: publicar sus lecciones, agregar su carpeta a `INCLUIR` en `catalogo.py` y volver a correr `python publicador/catalogo.py`.
