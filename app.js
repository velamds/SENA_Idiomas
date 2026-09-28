(function () {
  "use strict";

  var catalogo = null;
  var programas = [];  // lista plana: {idioma, programa}
  var indice = [];     // una entrada por lección, con el texto donde se busca
  var MAX_RES = 40;    // lecciones por página de resultados
  var mostrar = MAX_RES;
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
  function plano(s) { return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  // Minúsculas, sin tildes y sin signos (se conserva el punto para niveles como "a1.1")
  function normal(s) { return plano(s).replace(/[^a-z0-9.]+/g, " ").replace(/(^|\s)\.+|\.+(\s|$)/g, " ").trim(); }
  function palabrasDe(q) {
    // "lección 5" y "objeto 3" se buscan juntos; se ignoran letras sueltas ("s" de what's)
    return normal(q).replace(/\b(leccion|lec|objeto|obj|ob)\s+0*(\d+)\b/g, function (_, t, n) {
      return (/^l/.test(t) ? "leccion_" : "objeto_") + n;
    }).split(" ").filter(function (p) { return p.length > 1 || /\d/.test(p); });
  }
  // Algunos manifiestos traen textos de relleno como "empty": nunca se muestran
  function limpio(s) {
    var t = String(s == null ? "" : s).trim();
    return /^(empty|null|none|undefined|-)?$/i.test(t) ? "" : t;
  }
  function tituloLeccion(lec) { return limpio(lec.titulo) || "Lección " + dos(lec.numero); }
  function tituloObjeto(o) { return limpio(o.titulo) || "Objeto " + o.ob.replace(/^ob/, ""); }

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

  // Ruta: #/<programa>/<nivel>
  function actual() {
    var partes = decodeURIComponent(location.hash.replace(/^#\/?/, "")).split("/");
    var sel = programas[0];
    for (var i = 0; i < programas.length; i++) if (programas[i].programa.id === partes[0]) sel = programas[i];
    var niveles = sel.programa.niveles, nivel = niveles[0];
    for (var j = 0; j < niveles.length; j++) if (niveles[j].id === partes[1]) nivel = niveles[j];
    return { idioma: sel.idioma, programa: sel.programa, nivel: nivel };
  }

  function pintarIdiomas(sel) {
    $("idiomas").innerHTML = catalogo.idiomas.map(function (idioma) {
      var activo = idioma.id === sel.idioma.id ? ' aria-current="page"' : "";
      return '<a href="#/' + esc(idioma.programas[0].id) + '"' + activo + ">" + esc(idioma.nombre) + "</a>";
    }).join("");
  }

  var CHEVRON = '<svg class="chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

  function listaObjetos(lec, soloEstos) {
    return lec.objetos.filter(function (o) { return !soloEstos || soloEstos.indexOf(o) >= 0; }).map(function (o) {
      var t = esc(tituloObjeto(o)), n = ' data-n="' + esc(o.ob.replace(/^ob/, "")) + '"';
      return "<li>" + (o.url
        ? '<a href="' + esc(o.url) + '" target="_blank" rel="noopener"' + n + ">" + t + "</a>"
        : '<span class="omitido"' + n + ">" + t + " <em>omitido</em></span>") + "</li>";
    }).join("");
  }

  function tarjeta(lec) {
    var disponibles = lec.objetos.filter(function (o) { return o.url; }).length;
    var meta = plural(disponibles, "objeto", "objetos") +
      (disponibles < lec.objetos.length ? " · " + (lec.objetos.length - disponibles) + " omitido" : "");
    var aprox = lec.titulo_aprox && limpio(lec.titulo)
      ? '<p class="leccion-nota" title="El paquete original no trae título de lección; se muestra el de su primer objeto.">Tema inicial de la lección</p>' : "";
    return '<article class="leccion" id="' + esc(lec.codigo) + '">' +
      '<div class="leccion-cab">' +
        '<p class="leccion-num">Lección ' + dos(lec.numero) + "</p>" +
        "<h4>" + esc(tituloLeccion(lec)) + "</h4>" + aprox +
        '<p class="leccion-meta">' + meta + " · <code>" + esc(lec.codigo) + "</code></p>" +
      "</div>" +
      '<details class="ver-objetos"><summary><span class="ver">Ver los ' + lec.objetos.length + ' objetos</span>' +
        '<span class="ocultar">Ocultar objetos</span>' + CHEVRON + "</summary>" +
        '<ol class="objetos">' + listaObjetos(lec) + "</ol></details>" +
      '<div class="leccion-pie"><a class="btn" href="' + esc(lec.url) + '" target="_blank" rel="noopener">Abrir lección</a></div>' +
      "</article>";
  }

  function pintarPrograma(sel) {
    var idioma = sel.idioma, prog = sel.programa, nivel = sel.nivel, total = contar(prog);
    document.title = prog.nombre + " · " + nivel.nombre + " · SENA Idiomas";
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
    html += '<nav class="niveles" aria-label="Niveles"><span class="niveles-rotulo">Nivel</span>' + prog.niveles.map(function (n) {
      return '<a href="#/' + esc(prog.id) + "/" + esc(n.id) + '"' + (n.id === nivel.id ? ' aria-current="true"' : "") + ">" +
        esc(n.nombre) + ' <span class="cuenta">' + n.lecciones.length + "</span></a>";
    }).join("") + "</nav>";
    html += '<section class="nivel" id="niv-' + esc(nivel.id) + '">' +
      '<div class="nivel-cab"><h3><span>Nivel</span>' + esc(nivel.nombre) + "</h3>" +
      "<p>" + plural(nivel.lecciones.length, "lección", "lecciones") + "</p></div>" +
      '<div class="grid">' + nivel.lecciones.map(tarjeta).join("") + "</div></section>";
    contenido.innerHTML = html;
  }

  // ---------- Búsqueda ----------

  function variantesNivel(n) {
    // "A1.1" se encuentra también como "a1 1", "a11", "nivel a1.1"; "Pre A1" como "prea1"
    var v = normal(n.nombre);
    return ["nivel", v, v.replace(/[. ]/g, ""), v.replace(/\./g, " "), normal(n.id)].join(" ");
  }

  function construirIndice() {
    programas.forEach(function (sel) {
      sel.programa.niveles.forEach(function (n) {
        n.lecciones.forEach(function (lec) {
          var contexto = normal([sel.idioma.nombre, sel.programa.nombre, lec.codigo, limpio(lec.titulo)].join(" ")) +
            " leccion_" + lec.numero + " " + variantesNivel(n);
          indice.push({
            sel: sel, nivel: n, lec: lec, contexto: " " + contexto + " ",
            objetos: lec.objetos.map(function (o) {
              var num = parseInt(o.ob.replace(/^ob/, ""), 10);
              return {
                o: o,
                titulo: " " + normal(limpio(o.titulo)) + " ",
                temas: (o.temas || []).map(function (t) { return { t: t, n: " " + normal(t) + " " }; }),
                otros: " objeto_" + num + " " + normal([o.ob, lec.codigo + o.ob].join(" ")) + " "
              };
            })
          });
        });
      });
    });
  }

  // Los números se buscan como palabra completa ("5" no debe encontrar la lección 15); el resto, como prefijo o parte
  function contiene(texto, palabra) {
    return /^\d+$/.test(palabra) ? texto.indexOf(" " + palabra + " ") >= 0 : texto.indexOf(palabra) >= 0;
  }

  function buscarEn(q, ambito) {
    var palabras = palabrasDe(q), res = [], frase = " " + normal(q) + " ";
    if (!palabras.length) return res;
    var tieneFrase = function (t) { return palabras.length > 1 && t.indexOf(frase.trim()) >= 0; };
    indice.forEach(function (e) {
      if (ambito && e.sel.programa.id !== ambito) return;
      var faltan = palabras.filter(function (p) { return !contiene(e.contexto, p); });
      var puntos = palabras.length - faltan.length;
      if (!faltan.length && palabras.some(function (p) { return contiene(" " + normal(limpio(e.lec.titulo)) + " ", p); })) puntos += 5;
      // Objetos donde las palabras que la lección no cubre aparecen en su título, temas o número
      var objetos = [];
      e.objetos.forEach(function (x) {
        var temasHallados = [];
        var ok = faltan.every(function (p) {
          if (contiene(x.titulo, p) || contiene(x.otros, p)) return true;
          var hit = x.temas.filter(function (t) { return contiene(t.n, p); });
          hit.forEach(function (t) { if (temasHallados.indexOf(t.t) < 0) temasHallados.push(t.t); });
          return hit.length > 0;
        });
        // si la lección ya coincide completa, se señalan igual los objetos que nombran lo buscado
        if (!faltan.length) {
          ok = palabras.some(function (p) { return contiene(x.titulo, p); });
          palabras.forEach(function (p) {
            x.temas.forEach(function (t) { if (contiene(t.n, p) && temasHallados.indexOf(t.t) < 0) { temasHallados.push(t.t); ok = true; } });
          });
        }
        if (ok && x.o.url) objetos.push({ o: x.o, temas: temasHallados, enTitulo: palabras.some(function (p) { return contiene(x.titulo, p); }) });
      });
      if (faltan.length && !objetos.length) return;
      puntos += objetos.filter(function (x) { return x.enTitulo; }).length * 2 + objetos.length;
      if (tieneFrase(e.contexto)) puntos += 20;
      e.objetos.forEach(function (x) {
        if (x.o.url && (tieneFrase(x.titulo) || x.temas.some(function (t) { return tieneFrase(t.n); }))) puntos += 6;
      });
      res.push({ e: e, objetos: objetos, completa: !faltan.length, puntos: puntos });
    });
    res.sort(function (a, b) {
      return b.puntos - a.puntos || a.e.sel.idioma.orden - b.e.sel.idioma.orden ||
        programas.indexOf(a.e.sel) - programas.indexOf(b.e.sel) ||
        a.e.sel.programa.niveles.indexOf(a.e.nivel) - b.e.sel.programa.niveles.indexOf(b.e.nivel) ||
        a.e.lec.numero - b.e.lec.numero;
    });
    return res;
  }

  function resaltar(texto, q) {
    var t = String(texto), palabras = palabrasDe(q).filter(function (p) { return p.length > 1; });
    // carácter por carácter, para que "leccion" resalte "Lección" sin descuadrar posiciones
    var base = Array.prototype.map.call(t, function (c) { return plano(c).charAt(0) || c; }).join("");
    var marcas = new Array(t.length);
    palabras.forEach(function (p) {
      var i = base.indexOf(p);
      while (i >= 0) { for (var k = i; k < i + p.length; k++) marcas[k] = true; i = base.indexOf(p, i + p.length); }
    });
    var out = "", abierta = false;
    for (var i = 0; i < t.length; i++) {
      if (marcas[i] && !abierta) { out += "<mark>"; abierta = true; }
      if (!marcas[i] && abierta) { out += "</mark>"; abierta = false; }
      out += esc(t[i]);
    }
    return out + (abierta ? "</mark>" : "");
  }

  var ambitoTodo = true;

  function pintarBusqueda(texto) {
    var sel = actual(), q = texto.trim();
    var res = buscarEn(q, ambitoTodo ? null : sel.programa.id);
    document.title = "Buscar «" + q + "» · SENA Idiomas";
    var nObjetos = res.reduce(function (s, r) { return s + r.objetos.length; }, 0);
    var html = '<div class="busqueda-cab"><h2 class="titulo-prog">Resultados</h2>' +
      '<div class="ambito" role="group" aria-label="Dónde buscar">' +
        '<button type="button" data-ambito="todo" aria-pressed="' + ambitoTodo + '">Todos los programas</button>' +
        '<button type="button" data-ambito="prog" aria-pressed="' + !ambitoTodo + '">Solo ' + esc(sel.programa.nombre) + "</button>" +
      "</div></div>" +
      '<p class="resumen">' + plural(res.length, "lección", "lecciones") +
      (nObjetos ? " y " + plural(nObjetos, "objeto", "objetos") : "") + " para «" + esc(q) + "»</p>";
    if (!res.length) {
      html += '<div class="estado"><p>No se encontró nada con esas palabras.</p>' +
        '<p class="ayuda">Pruebe con un tema o punto gramatical (<em>present continuous</em>, <em>saluer</em>), un nivel (<em>A2.1</em>), ' +
        "un número de lección (<em>lección 5</em>) o un código (<em>engenn2le01</em>).</p></div>";
    } else {
      html += '<ul class="resultados">' + res.slice(0, mostrar).map(function (r) {
        var e = r.e, lec = e.lec;
        var donde = e.sel.idioma.nombre + " · " + e.sel.programa.nombre + " · Nivel " + e.nivel.nombre + " · Lección " + dos(lec.numero);
        var objs = r.objetos.map(function (x) {
          return '<li><a href="' + esc(x.o.url) + '" target="_blank" rel="noopener">' +
            '<span class="num">' + dos(parseInt(x.o.ob.replace(/^ob/, ""), 10)) + "</span>" +
            '<span class="ob-t">' + resaltar(tituloObjeto(x.o), q) +
            (x.temas.length ? '<span class="temas">' + x.temas.slice(0, 4).map(function (t) {
              return '<span class="tema">' + resaltar(t, q) + "</span>";
            }).join("") + "</span>" : "") +
            "</span></a></li>";
        }).join("");
        return '<li class="res">' +
          '<div class="res-cab"><div><p class="res-donde">' + esc(donde) + "</p>" +
            '<a class="res-titulo" href="' + esc(lec.url) + '" target="_blank" rel="noopener">' + resaltar(tituloLeccion(lec), q) + "</a>" +
            ' <code>' + resaltar(lec.codigo, q) + "</code></div>" +
            '<a class="btn btn-sec" href="#/' + esc(e.sel.programa.id) + "/" + esc(e.nivel.id) + '" data-ir="' + esc(lec.codigo) + '">Ver en su nivel</a></div>' +
          (objs ? '<ol class="res-objetos">' + objs + "</ol>" : "") +
          "</li>";
      }).join("") + "</ul>";
      if (res.length > mostrar) {
        html += '<p class="mas"><button type="button" class="btn btn-sec" data-mas>Mostrar ' +
          Math.min(MAX_RES, res.length - mostrar) + " más de " + (res.length - mostrar) + "</button></p>";
      }
    }
    contenido.innerHTML = html;
  }

  function render() {
    var sel = actual();
    pintarIdiomas(sel);
    if (buscar.value.trim().length >= 2) pintarBusqueda(buscar.value);
    else pintarPrograma(sel);
    ajustarCabecera();
  }

  contenido.addEventListener("click", function (e) {
    var amb = e.target.closest("[data-ambito]");
    if (amb) { ambitoTodo = amb.getAttribute("data-ambito") === "todo"; mostrar = MAX_RES; render(); return; }
    if (e.target.closest("[data-mas]")) { mostrar += MAX_RES; render(); return; }
    var ir = e.target.closest("[data-ir]");
    if (ir) {
      // Ir a la lección dentro de su nivel, abrirla y resaltarla
      e.preventDefault();
      var codigo = ir.getAttribute("data-ir");
      buscar.value = "";
      if (location.hash !== ir.getAttribute("href")) history.pushState(null, "", ir.getAttribute("href"));
      render();
      var tarjetaLec = document.getElementById(codigo);
      if (tarjetaLec) {
        tarjetaLec.classList.add("destacada");
        tarjetaLec.querySelector("details").open = true;
        var y = tarjetaLec.getBoundingClientRect().top + window.scrollY - cabecera.offsetHeight - 70;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }
  });
  buscar.addEventListener("input", function () { mostrar = MAX_RES; render(); });
  buscar.addEventListener("keydown", function (e) { if (e.key === "Escape") { buscar.value = ""; render(); } });
  var progAnterior = null;
  window.addEventListener("hashchange", function () {
    var enBusqueda = buscar.value.trim().length >= 2;
    buscar.value = "";
    render();
    // Al cambiar de nivel dentro del mismo programa, la barra de niveles queda donde estaba; si no, se vuelve arriba
    var prog = actual().programa.id, barra = document.querySelector(".niveles");
    var tope = barra ? barra.offsetTop - cabecera.offsetHeight : 0;
    if (!enBusqueda && prog === progAnterior && barra) window.scrollTo(0, Math.min(window.scrollY, tope));
    else window.scrollTo(0, 0);
    progAnterior = prog;
  });
  window.addEventListener("resize", ajustarCabecera);

  fetch("catalogo.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      catalogo = data;
      data.idiomas.forEach(function (idioma, i) {
        idioma.orden = i;
        idioma.programas.forEach(function (p) { programas.push({ idioma: idioma, programa: p }); });
      });
      construirIndice();
      var f = new Date(data.generado);
      $("generado").textContent = "Actualizado el " + f.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }) + ".";
      render();
      progAnterior = actual().programa.id;
    })
    .catch(function () {
      contenido.innerHTML = '<p class="estado">No se pudo cargar el catálogo de lecciones.</p>';
    });
})();
