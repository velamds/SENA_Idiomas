(function () {
  "use strict";

  var catalogo = null;
  var programas = [];  // lista plana: {idioma, programa}
  var $ = function (id) { return document.getElementById(id); };
  var contenido = $("contenido");
  var buscar = $("buscar");
  var cabecera = document.querySelector(".top");

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function dos(n) { return (n < 10 ? "0" : "") + n; }
  function plural(n, uno, varios) { return n + " " + (n === 1 ? uno : varios); }
  function normal(s) { return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }

  function ajustarCabecera() {
    document.documentElement.style.setProperty("--alto-cab", cabecera.offsetHeight + "px");
  }

  function contar(prog) {
    var l = 0, o = 0;
    prog.niveles.forEach(function (n) {
      l += n.lecciones.length;
      n.lecciones.forEach(function (x) { o += x.objetos.filter(function (b) { return b.url; }).length; });
    });
    return { lecciones: l, objetos: o };
  }

  function actual() {
    var id = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
    for (var i = 0; i < programas.length; i++) if (programas[i].programa.id === id) return programas[i];
    return programas[0];
  }

  function pintarIdiomas(sel) {
    $("idiomas").innerHTML = catalogo.idiomas.map(function (idioma) {
      var activo = idioma.id === sel.idioma.id ? ' aria-current="page"' : "";
      return '<a href="#/' + esc(idioma.programas[0].id) + '"' + activo + ">" + esc(idioma.nombre) + "</a>";
    }).join("");
  }

  function tarjeta(lec) {
    var disponibles = lec.objetos.filter(function (o) { return o.url; }).length;
    var meta = plural(disponibles, "objeto", "objetos") +
      (disponibles < lec.objetos.length ? " · " + (lec.objetos.length - disponibles) + " omitido" : "");
    var objetos = lec.objetos.map(function (o) {
      var t = esc(o.titulo || o.ob);
      return "<li>" + (o.url
        ? '<a href="' + esc(o.url) + '" target="_blank" rel="noopener">' + t + "</a>"
        : '<span class="omitido">' + t + " <em>omitido</em></span>") + "</li>";
    }).join("");
    return '<article class="leccion" id="' + esc(lec.codigo) + '">' +
      '<div class="leccion-cab">' +
        '<p class="leccion-num">Lección ' + dos(lec.numero) + "</p>" +
        "<h4>" + esc(lec.titulo || lec.codigo) + "</h4>" +
        '<p class="leccion-meta">' + meta + " · <code>" + esc(lec.codigo) + "</code></p>" +
      "</div>" +
      "<details><summary>Ver objetos</summary><ol class=\"objetos\">" + objetos + "</ol></details>" +
      '<div class="leccion-pie"><a class="btn" href="' + esc(lec.url) + '" target="_blank" rel="noopener">Abrir lección</a></div>' +
      "</article>";
  }

  function pintarPrograma(sel) {
    var idioma = sel.idioma, prog = sel.programa, total = contar(prog);
    document.title = prog.nombre + " · SENA Idiomas";
    var html = "";
    if (idioma.programas.length > 1) {
      html += '<nav class="programas" aria-label="Programas de ' + esc(idioma.nombre) + '">' +
        idioma.programas.map(function (p) {
          return '<a class="chip" href="#/' + esc(p.id) + '"' + (p.id === prog.id ? ' aria-current="page"' : "") + ">" +
            esc(p.nombre) + "</a>";
        }).join("") + "</nav>";
    }
    html += '<h2 class="titulo-prog">' + esc(prog.nombre) + "</h2>" +
      '<p class="resumen">' + plural(prog.niveles.length, "nivel", "niveles") + " · " +
      plural(total.lecciones, "lección", "lecciones") + " · " + plural(total.objetos, "objeto", "objetos") + "</p>";
    html += '<div class="niveles" role="navigation" aria-label="Niveles">' + prog.niveles.map(function (n) {
      return '<button type="button" data-nivel="niv-' + esc(n.id) + '">' + esc(n.nombre) + "</button>";
    }).join("") + "</div>";
    html += prog.niveles.map(function (n) {
      return '<section class="nivel" id="niv-' + esc(n.id) + '">' +
        '<div class="nivel-cab"><h3><span>' + esc(n.nombre) + "</span>Nivel " + esc(n.nombre) + "</h3>" +
        "<p>" + plural(n.lecciones.length, "lección", "lecciones") + "</p></div>" +
        '<div class="grid">' + n.lecciones.map(tarjeta).join("") + "</div></section>";
    }).join("");
    contenido.innerHTML = html;
  }

  function resaltar(texto, q) {
    var t = String(texto), i = normal(t).indexOf(q);
    if (i < 0 || !q) return esc(t);
    return esc(t.slice(0, i)) + "<mark>" + esc(t.slice(i, i + q.length)) + "</mark>" + esc(t.slice(i + q.length));
  }

  function pintarBusqueda(texto) {
    var q = normal(texto.trim()), res = [];
    programas.forEach(function (sel) {
      sel.programa.niveles.forEach(function (n) {
        n.lecciones.forEach(function (lec) {
          var donde = sel.programa.nombre + " · " + n.nombre + " · Lección " + dos(lec.numero);
          if (normal(lec.titulo + " " + lec.codigo).indexOf(q) >= 0) {
            res.push({ url: lec.url, titulo: resaltar(lec.titulo || lec.codigo, q), donde: esc(donde) });
          }
          lec.objetos.forEach(function (o) {
            if (o.url && normal(o.titulo).indexOf(q) >= 0) {
              res.push({ url: o.url, titulo: resaltar(o.titulo, q), donde: esc(donde + " · " + (lec.titulo || "")) });
            }
          });
        });
      });
    });
    var max = 200;
    contenido.innerHTML = '<h2 class="titulo-prog">Resultados</h2><p class="resumen">' +
      plural(res.length, "coincidencia", "coincidencias") + " para «" + esc(texto.trim()) + "»" +
      (res.length > max ? " (se muestran " + max + ")" : "") + "</p>" +
      (res.length ? '<ul class="resultados">' + res.slice(0, max).map(function (r) {
        return '<li><a href="' + esc(r.url) + '" target="_blank" rel="noopener"><strong>' + r.titulo +
          "</strong><span>" + r.donde + "</span></a></li>";
      }).join("") + "</ul>" : '<p class="estado">No se encontraron lecciones con ese texto.</p>');
  }

  function render() {
    var sel = actual();
    pintarIdiomas(sel);
    if (buscar.value.trim().length >= 2) pintarBusqueda(buscar.value);
    else pintarPrograma(sel);
    ajustarCabecera();
  }

  contenido.addEventListener("click", function (e) {
    var b = e.target.closest("[data-nivel]");
    if (!b) return;
    var destino = document.getElementById(b.getAttribute("data-nivel"));
    var barra = document.querySelector(".niveles");
    var y = destino.getBoundingClientRect().top + window.scrollY - cabecera.offsetHeight - barra.offsetHeight - 8;
    window.scrollTo({ top: y, behavior: "smooth" });
  });
  buscar.addEventListener("input", render);
  window.addEventListener("hashchange", function () { buscar.value = ""; render(); window.scrollTo(0, 0); });
  window.addEventListener("resize", ajustarCabecera);

  fetch("catalogo.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      catalogo = data;
      data.idiomas.forEach(function (idioma) {
        idioma.programas.forEach(function (p) { programas.push({ idioma: idioma, programa: p }); });
      });
      var f = new Date(data.generado);
      $("generado").textContent = "Actualizado el " + f.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }) + ".";
      render();
    })
    .catch(function () {
      contenido.innerHTML = '<p class="estado">No se pudo cargar el catálogo de lecciones.</p>';
    });
})();
