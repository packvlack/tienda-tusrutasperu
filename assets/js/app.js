/* ============================================================
   TUS RUTAS PERÚ · TIENDA — app.js (v1)
   Render de ofertas desde data/deals.json + filtros por categoría.
   ============================================================ */
(function () {
  "use strict";

  var TAG = "tusrutasper0e-20";
  var DATA_URL = "data/deals.json";

  function affLink(asin) {
    return "https://www.amazon.com/dp/" + encodeURIComponent(asin) + "?tag=" + TAG;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function num(v) {
    if (v == null) return null;
    var n = parseFloat(String(v).replace(/[^0-9.]/g, ""));
    return isNaN(n) ? null : n;
  }

  function discountPct(p) {
    var now = num(p.precio), before = num(p.precio_antes);
    if (now == null || before == null || before <= now) return null;
    return Math.round((1 - now / before) * 100);
  }

  function histStats(p) {
    var h = p.historial || [];
    var nums = [];
    h.forEach(function(e){ var n = num(e.precio); if (n != null) nums.push(n); });
    if (!nums.length) return null;
    var min = Math.min.apply(null, nums);
    var sum = nums.reduce(function(a,b){ return a + b; }, 0);
    return { min: min, avg: sum / nums.length, n: nums.length };
  }

  function dealVerdict(p, st) {
    if (!st || st.n < 2) return "";
    var now = num(p.precio);
    if (now == null) return "";
    if (now <= st.min) return ' <strong class="hot">🔥 MÍNIMO HISTÓRICO</strong>';
    if (now <= st.avg * 0.9) return ' <strong class="good">✓ BUEN PRECIO</strong>';
    if (now >= st.avg * 1.1) return ' <span class="wait">⏳ ALTO · CONVIENE ESPERAR</span>';
    return "";
  }

  function isDeal(p) {
    var v = dealVerdict(p, histStats(p));
    return v.indexOf("hot") !== -1 || v.indexOf("good") !== -1;
  }

  function sparkline(p) {
    var h = p.historial || [];
    if (h.length < 2) return "";
    var vals = h.map(function(e){ return Number(e.precio); });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    var w = 110, hgt = 34, pad = 4;
    var trend = vals[vals.length - 1] <= vals[0] ? "down" : "up";
    var pts = vals.map(function(v, i){
      var x = pad + (w - pad * 2) * (vals.length === 1 ? 0.5 : i / (vals.length - 1));
      var y = (max === min) ? hgt / 2 : hgt - pad - (hgt - pad * 2) * (v - min) / (max - min);
      return x.toFixed(1) + "," + y.toFixed(1);
    });
    var last = pts[pts.length - 1].split(",");
    return '<svg class="spark ' + trend + '" viewBox="0 0 ' + w + ' ' + hgt + '" aria-hidden="true">' +
      '<polyline points="' + pts.join(" ") + '" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<circle cx="' + last[0] + '" cy="' + last[1] + '" r="4.5" fill="currentColor"/></svg>';
  }

  function histBlock(p) {
    var st = histStats(p);
    if (!st) return "";
    return '<div class="hist-line">' + sparkline(p) +
      '<div class="hist-stats mono">Mín $' + st.min.toFixed(2) + ' · Prom $' + st.avg.toFixed(2) + dealVerdict(p, st) + '</div></div>' +
      histTable(p);
  }

  function histTable(p) {
    var h = p.historial || [];
    if (!h.length) return "";
    var rows = h.slice().reverse().map(function(e){
      return '<tr><td>' + esc(e.fecha) + '</td><td>$' + Number(e.precio).toFixed(2) + '</td></tr>';
    }).join("");
    return '<details class="hist"><summary>Historial de precios (' + h.length + ')</summary>' +
      '<table><thead><tr><th>Fecha</th><th>Precio</th></tr></thead><tbody>' + rows + '</tbody></table></details>';
  }

  function card(p) {
    var off = discountPct(p);
    var img = p.imagen
      ? '<img src="' + esc(p.imagen) + '" alt="' + esc(p.nombre) + '" loading="lazy" referrerpolicy="no-referrer">'
      : '<div class="noimg">Sin foto<br>ver en Amazon</div>';
    return '<article class="card">' +
      '<div class="card-img">' + img +
      (off ? '<span class="card-off">−' + off + '%</span>' : '') +
      (p.envio_peru_gratis ? '<span class="card-ship">✈ Envío gratis a Perú</span>' : '') +
      '</div>' +
      '<div class="card-body">' +
      '<span class="tag">' + esc(p.categoria) + '</span>' +
      '<h3 class="card-name">' + esc(p.nombre) + '</h3>' +
      '<div class="card-prices">' +
      '<span class="price">' + esc(p.precio) + '</span>' +
      (p.precio_antes ? '<span class="price-before">' + esc(p.precio_antes) + '</span>' : '') +
      '</div>' +
      histBlock(p) +
      '<a class="card-cta" href="' + affLink(p.asin) + '" target="_blank" rel="nofollow sponsored noopener">🔥 Ver oferta en Amazon</a>' +
      '<span class="card-meta">Verificado ' + esc(p.fecha_verificado || "") + ' · ASIN ' + esc(p.asin) + '</span>' +
      '</div></article>';
  }

  function render(deals, cat) {
    var grid = document.getElementById("grid");
    var list = cat === "Todas" ? deals : (cat === "🔥 Ofertas" ? deals.filter(isDeal) : deals.filter(function (d) { return d.categoria === cat; }));
    if (!list.length) {
      grid.innerHTML = '<div class="empty">No hay ofertas en esta categoría por ahora. Vuelve pronto. ◈</div>';
    } else {
      grid.innerHTML = list.map(card).join("");
    }
    document.getElementById("dealsCount").textContent = list.length + " oferta" + (list.length === 1 ? "" : "s");
    document.getElementById("heroCount").textContent = deals.length + " productos";
  }

  function chips(deals, onPick) {
    var box = document.getElementById("chips");
    var cats = ["Todas"];
    if (deals.some(isDeal)) cats.push("🔥 Ofertas");
    deals.forEach(function (d) { if (cats.indexOf(d.categoria) === -1) cats.push(d.categoria); });
    box.innerHTML = cats.map(function (c, i) {
      return '<button class="chip' + (i === 0 ? " active" : "") + '" data-cat="' + esc(c) + '">' + esc(c) + '</button>';
    }).join("");
    box.querySelectorAll(".chip").forEach(function (b) {
      b.addEventListener("click", function () {
        box.querySelectorAll(".chip").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        onPick(b.dataset.cat);
      });
    });
  }

  fetch(DATA_URL)
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (deals) {
      if (!Array.isArray(deals) || !deals.length) throw new Error("sin datos");
      var current = "Todas";
      chips(deals, function (c) { current = c; render(deals, c); });
      render(deals, current);
      // Fecha de última revisión: la fecha_verificado más reciente del catálogo.
      // Así el badge del hero y la nota del pie nunca quedan congelados en una
      // fecha vieja aunque la revisión diaria solo toque data/deals.json.
      var latest = deals.map(function (d) { return d.fecha_verificado || ""; })
        .filter(Boolean).sort().pop() || "";
      if (latest) {
        var dp = latest.split("-");
        var f = dp.length === 3 ? dp[2] + "/" + dp[1] + "/" + dp[0] : latest;
        var hv = document.getElementById("heroVerified");
        if (hv) hv.textContent = "✓ Revisado el " + f;
        var fv = document.getElementById("footVerified");
        if (fv) fv.textContent = "Última revisión " + f + ". Los precios pueden variar en Amazon al momento de tu compra.";
      }
    })
    .catch(function (e) {
      document.getElementById("grid").innerHTML =
        '<div class="empty">No se pudieron cargar las ofertas (' + esc(e.message) + '). Recarga la página. ◈</div>';
    });
})();
