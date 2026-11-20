// سالن‌ها: فیلتر و مرتب‌سازی کارت‌ها، «نزدیک من» با موقعیت مکانی، نقشه (Leaflet) و انتخاب نقطه روی نقشه.
//   کارت‌ها:  <article data-salon data-lat data-lng data-rating data-price data-cats data-open data-top …>
//   فیلترها:  <form data-salon-filters> با فیلدهای q (جستجو), category (خدمات), sort؛ همان لحظه اعمال و در آدرس می‌مانند.
//             [data-active-filters] برچسب فیلترهای فعال با ×، [data-filters-reset] پاک کردن همه.
//   نقشه:     <div data-map> (فهرست) · <div data-map data-single data-lat data-lng> (یک سالن) · <div data-map data-pick> (انتخاب نقطه در ثبت سالن)
//   نزدیک:    هر <button data-locate> موقعیت را می‌گیرد و کارت‌های همان صفحه را بر اساس فاصله مرتب می‌کند.
// بک‌اند: داده‌ها نمونه‌اند؛ با داده واقعی بهتر است فیلتر و فاصله سمت سرور (?lat=&lng=) حساب شود.
(function () {
  "use strict";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var faNum = function (n, d) { return Number(n).toLocaleString("fa-IR", { maximumFractionDigits: d || 0 }); };
  var norm = function (s) {
    return (s || "").replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 0x06f0); })
      .replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[‌\s]+/g, " ").trim().toLowerCase();
  };
  var params = new URLSearchParams(location.search);
  var me = null; // {lat, lng}
  // نقشه (پیش از هر فراخوانی تعریف شود)
  var TEHRAN = [35.735, 51.41];
  var TILE = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  var ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
  var listMap = null, markers = {}, meMarker = null;

  // ---------- فاصله ----------
  function km(a, b) {
    var R = 6371, rad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  function distLabel(d) { return d < 1 ? faNum(Math.round(d * 1000 / 50) * 50) + " متر" : faNum(d, 1) + " کیلومتر"; }

  function applyDistances() {
    if (!me) return;
    $$("[data-salon]").forEach(function (card) {
      var d = km(me, { lat: +card.dataset.lat, lng: +card.dataset.lng });
      card.dataset.km = d.toFixed(3);
      var badge = $("[data-distance]", card);
      if (badge) { badge.textContent = distLabel(d); badge.hidden = false; }
    });
  }

  // موقعیت از common/location.js (BellaLoc) می‌آید؛ همان‌جا ذخیره و بین صفحه‌ها مشترک است.
  function useLoc(loc, sortNow) {
    var status = $$("[data-near-status]");
    if (!loc || loc.mode !== "gps" || loc.lat == null) {
      status.forEach(function (s) { s.textContent = !loc ? "" : loc.mode === "manual" ? " · " + loc.city : " · بدون موقعیت؛ سالن‌های " + loc.city; });
      return false;
    }
    me = { lat: loc.lat, lng: loc.lng };
    // خارج از محدوده نمونه (مثلاً شهر دیگر): مرکز تهران تا فاصله‌ها معنا داشته باشند
    if (km(me, { lat: 35.75, lng: 51.42 }) > 80) me = { lat: 35.7219, lng: 51.3347, demo: true };
    $$("[data-locate]").forEach(function (b) { b.setAttribute("aria-pressed", "true"); });
    status.forEach(function (s) { s.textContent = me.demo ? " · فعلاً سالن‌های تهران (در " + loc.city + " هنوز سالن نمونه نداریم)" : " · مرتب‌شده بر اساس فاصله از شما"; });
    applyDistances();
    if (sortNow) {
      var sort = filtersForm && $("[name=sort]", filtersForm);
      if (sort) { sort.value = "near"; sort.dispatchEvent(new Event("change", { bubbles: true })); }
      else $$("[data-salon-list]").forEach(function (l) { sortList(l, "near"); l.scrollLeft = 0; l.dispatchEvent(new Event("scroll")); });
    }
    showMe();
    return true;
  }
  function locate(btn) {
    if (!window.BellaLoc) return;
    if (btn) btn.setAttribute("aria-busy", "true");
    $$("[data-near-status]").forEach(function (s) { s.textContent = " · در حال پیدا کردن موقعیت…"; });
    BellaLoc.request().then(function (loc) {
      if (btn) btn.removeAttribute("aria-busy");
      if (!useLoc(loc, true) && BellaLoc.help) BellaLoc.help(); // راهنمای روشن کردن دسترسی
    });
  }
  document.addEventListener("bella:location", function (e) { useLoc(e.detail, true); });
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-locate]");
    if (b) { e.preventDefault(); locate(b); }
    var fav = e.target.closest("[data-fav]");
    if (fav) {
      var on = fav.getAttribute("aria-pressed") !== "true";
      fav.setAttribute("aria-pressed", String(on));
      SalonUI.toast(on ? "به سالن‌های ذخیره‌شده اضافه شد." : "از ذخیره‌ها برداشته شد.");
    }
  });

  // ---------- مرتب‌سازی ----------
  var SORTS = {
    near: function (a, b) { return (+a.dataset.km || 1e9) - (+b.dataset.km || 1e9); },
    top: function (a, b) { return b.dataset.rating - a.dataset.rating || b.dataset.reviews - a.dataset.reviews; },
    cheap: function (a, b) { return a.dataset.price - b.dataset.price; },
    popular: function (a, b) { return b.dataset.reviews - a.dataset.reviews; },
    expensive: function (a, b) { return b.dataset.price - a.dataset.price; },
    "": function (a, b) { return (b.dataset.top - a.dataset.top) || (b.dataset.rating * Math.log(+b.dataset.reviews + 1) - a.dataset.rating * Math.log(+a.dataset.reviews + 1)); }
  };
  function sortList(list, key) {
    if (!list) return;
    var cards = $$("[data-salon]", list);
    cards.sort(SORTS[key] || SORTS[""]);
    var tail = $("[data-empty]", list);
    cards.forEach(function (c) { list.insertBefore(c, tail || null); });
  }

  // ---------- فیلترها ----------
  var filtersForm = $("[data-salon-filters]");
  // مقدار یک فیلد فرم، چه input معمولی باشد چه گروه رادیو یا چک‌باکس
  function val(name) {
    var els = $$("[name=" + name + "]", filtersForm);
    if (!els.length) return "";
    if (els[0].type === "radio") { var c = els.filter(function (e) { return e.checked; })[0]; return c ? c.value : ""; }
    if (els[0].type === "checkbox") return els[0].checked ? els[0].value : "";
    return els[0].value;
  }
  function setVal(name, v) {
    $$("[name=" + name + "]", filtersForm).forEach(function (el) {
      if (el.type === "radio") el.checked = el.value === (v || "");
      else if (el.type === "checkbox") el.checked = Boolean(v);
      else el.value = v || "";
    });
  }
  var FIELDS = ["q", "category", "sort"];
  function readFilters() {
    return { q: norm(val("q")), category: val("category"), sort: val("sort") };
  }
  function applyFilters(push) {
    var f = readFilters(), list = $("[data-salon-list]"), shown = 0;
    if (f.sort === "near" && !me) { locate(null); }
    $$("[data-salon]", list).forEach(function (c) {
      var ok = (!f.q || norm(c.textContent).indexOf(f.q) > -1)
        && (!f.category || c.dataset.cats.split(",").indexOf(f.category) > -1);
      c.hidden = !ok;
      if (ok) shown++;
    });
    sortList(list, f.sort);
    $("[data-empty]", list).hidden = shown > 0;
    $$("[data-count]").forEach(function (el) { el.textContent = faNum(shown); });
    renderActive();
    syncMarkers();
    if (push) {
      var p = new URLSearchParams();
      FIELDS.forEach(function (k) { var v = val(k); if (v) p.set(k, v); });
      if (view === "map") p.set("view", "map");
      history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : ""));
    }
  }

  // برچسب فیلترهای فعال (هر کدام با × برداشته می‌شود) و عدد روی دکمه «فیلترها» (فقط فیلترهای داخل پنجره)
  // آیکن از فایل یکسان آیکن‌های سایت (کنار favicon)
  var SPRITE = ((document.querySelector('link[rel="icon"]') || {}).href || "assets/img/favicon.svg").replace(/favicon\.svg.*$/, "icons.svg");
  function svgIcon(name, cls) { return '<svg class="' + (cls ? cls + " " : "") + 'ph" aria-hidden="true"><use href="' + SPRITE + "#" + name + '"/></svg>'; }
  var X = svgIcon("x", "icon");
  function esc(t) { var d = document.createElement("div"); d.textContent = t; return d.innerHTML; }
  function chipLabel(name, v) {
    if (name === "q") return "«" + v + "»";
    if (name === "category") { var sel = $("[name=category]", filtersForm); return sel.options[sel.selectedIndex].text; }
    return v;
  }
  function renderActive() {
    var box = $("[data-active-filters]");
    var active = ["q", "category"].filter(function (k) { return val(k); });
    if (!box) return;
    box.hidden = !active.length;
    box.innerHTML = active.map(function (k) {
      var label = esc(chipLabel(k, val(k)));
      return '<button type="button" class="sl-active__chip" data-clear="' + k + '" aria-label="برداشتن فیلتر ' + label + '">' + X + label + "</button>";
    }).join("") + (active.length > 1 ? '<button type="button" class="sl-active__clear" data-filters-reset>پاک کردن همه</button>' : "");
  }
  function resetFilters() {
    FIELDS.forEach(function (k) { if (k !== "sort") setVal(k, ""); });
    applyFilters(true);
  }
  document.addEventListener("click", function (e) {
    if (!filtersForm) return;
    var c = e.target.closest("[data-clear]");
    if (c) { setVal(c.dataset.clear, ""); applyFilters(true); }
    if (e.target.closest("[data-filters-reset]")) resetFilters();
  });

  var view = params.get("view") === "map" ? "map" : "list";
  function setView(v, push) {
    view = v;
    var split = $("[data-map-split]");
    if (!split) return;
    split.dataset.viewMode = v;
    $$("[data-view]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.view === v)); });
    if (v === "map") initListMap();
    if (push) applyFilters(true);
  }

  if (filtersForm) {
    // مقدارهای اولیه از آدرس
    FIELDS.forEach(function (k) { if (params.get(k)) setVal(k, params.get(k)); });
    filtersForm.addEventListener("input", function () { applyFilters(true); });
    filtersForm.addEventListener("change", function () { applyFilters(true); });
    filtersForm.addEventListener("submit", function (e) { e.preventDefault(); applyFilters(true); });
    $$("[data-view]").forEach(function (b) { b.addEventListener("click", function () { setView(b.dataset.view, true); }); });
    setView(view, false);
    applyFilters(false);
    if (params.get("near")) locate($("[data-locate]", filtersForm));
  }

  // ---------- نقشه ----------

  function leafletReady(box) {
    if (window.L) return true;
    var fb = $("[data-map-fallback]", box);
    if (fb) fb.hidden = false;
    return false;
  }
  function baseMap(box, center, zoom) {
    var map = L.map($("[data-map-canvas]", box), { zoomControl: true, attributionControl: true, scrollWheelZoom: true }).setView(center, zoom);
    L.tileLayer(TILE, { maxZoom: 19, attribution: ATTR }).addTo(map);
    return map;
  }
  function pinIcon(card) {
    return L.divIcon({ className: "mk-pin", iconSize: [0, 0], iconAnchor: [0, 0],
      // فقط یک نقطه تا نشانگرهای نزدیک هم روی هم نیفتند؛ نام و امتیاز با هاور یا انتخاب نمایش داده می‌شود
      html: '<span class="mk-pin__dot"></span><span class="mk-pin__tag">' + card.dataset.name + " · ★ " + faNum(card.dataset.rating, 1) + "</span>" });
  }

  function initListMap() {
    var box = $("[data-map-split] [data-map]");
    if (!box || listMap || !leafletReady(box)) { if (listMap) setTimeout(function () { listMap.invalidateSize(); }, 50); return; }
    listMap = baseMap(box, TEHRAN, 12);
    $$("[data-salon]").forEach(function (card) {
      var m = L.marker([+card.dataset.lat, +card.dataset.lng], { icon: pinIcon(card), title: card.dataset.name }).addTo(listMap);
      var link = $("h3 a", card);
      m.bindPopup("<b>" + card.dataset.name + "</b>" + card.dataset.area + " · ★ " + faNum(card.dataset.rating, 1) +
        '<br><a href="' + link.getAttribute("href") + '">دیدن سالن و رزرو</a>');
      m.on("click", function () { highlight(card.dataset.id, true); });
      markers[card.dataset.id] = m;
      card.addEventListener("mouseenter", function () { highlight(card.dataset.id, false); });
    });
    showMe();
    // اندازه واقعی نقشه بعد از نمایان شدن معلوم می‌شود؛ بعد از آن محدوده نشانگرها را تنظیم کن
    setTimeout(function () { listMap.invalidateSize(); syncMarkers(); }, 60);
    // اندازه جعبه نقشه بعد از بارگذاری فونت‌ها و چیدمان موبایل عوض می‌شود؛ تا کاربر خودش نقشه را جابه‌جا نکرده، دوباره همه سالن‌ها را در کادر بیاور
    var userMoved = false;
    listMap.on("dragstart", function () { userMoved = true; });
    if (window.ResizeObserver) new ResizeObserver(function () { listMap.invalidateSize(); if (!userMoved) syncMarkers(); }).observe(box);
  }
  function syncMarkers() {
    if (!listMap) return;
    var bounds = [];
    $$("[data-salon]").forEach(function (card) {
      var m = markers[card.dataset.id];
      if (!m) return;
      if (card.hidden) listMap.removeLayer(m);
      else { m.addTo(listMap); bounds.push(m.getLatLng()); }
    });
    if (bounds.length) listMap.fitBounds(bounds, { padding: [32, 32], maxZoom: 15 });
  }
  function highlight(id, scroll) {
    $$("[data-salon]").forEach(function (c) { c.classList.toggle("is-active", c.dataset.id === id); });
    Object.keys(markers).forEach(function (k) {
      var el = markers[k].getElement();
      if (el) el.classList.toggle("is-active", k === id);
    });
    if (scroll) {
      var card = $('[data-salon][data-id="' + id + '"]');
      if (card) card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }
  function showMe() {
    if (!me || !listMap || !window.L) return;
    if (meMarker) meMarker.setLatLng([me.lat, me.lng]);
    else meMarker = L.marker([me.lat, me.lng], { icon: L.divIcon({ className: "mk-me", iconSize: [16, 16] }), title: "موقعیت شما" }).addTo(listMap);
  }

  // یک سالن (صفحه سالن)
  $$("[data-map][data-single]").forEach(function (box) {
    if (!leafletReady(box)) return;
    var p = [+box.dataset.lat, +box.dataset.lng];
    var map = baseMap(box, p, 15);
    map.scrollWheelZoom.disable();
    L.marker(p, { icon: L.divIcon({ className: "mk-pin", iconSize: [0, 0], iconAnchor: [0, 0], html: '<span class="mk-pin__tag">' + box.dataset.name + "</span>" }) }).addTo(map);
  });

  // انتخاب نقطه روی نقشه (ثبت سالن، تنظیمات سالن): زدن روی نقشه یا کشیدن نشانگر، فیلدهای [data-pick-lat]/[data-pick-lng] را پر می‌کند
  $$("[data-map][data-pick]").forEach(function (box) {
    var form = box.closest("form") || document;
    var lat = $("[data-pick-lat]", form), lng = $("[data-pick-lng]", form);
    if (!leafletReady(box)) return;
    // اگر فیلدها مختصات دارند (مثلاً تنظیمات سالن)، نقشه از همان نقطه شروع می‌شود و نشانگر همان‌جاست
    var has = lat && lng && isFinite(parseFloat(lat.value)) && isFinite(parseFloat(lng.value));
    var start = has ? [parseFloat(lat.value), parseFloat(lng.value)] : [+box.dataset.lat, +box.dataset.lng];
    var map = baseMap(box, start, has ? 15 : 13), marker = null;
    function set(ll) {
      if (marker) marker.setLatLng(ll);
      else marker = L.marker(ll, { draggable: true, icon: L.divIcon({ className: "mk-pin", iconSize: [0, 0], iconAnchor: [0, 0], html: '<span class="mk-pin__tag">سالن شما</span>' }) })
        .on("dragend", function () { set(marker.getLatLng()); }).addTo(map);
      lat.value = ll.lat.toFixed(6);
      lng.value = ll.lng.toFixed(6);
      lat.dispatchEvent(new Event("input", { bubbles: true }));
    }
    map.on("click", function (e) { set(e.latlng); });
    if (has) set(L.latLng(start[0], start[1]));
    // مختصات را دستی تایپ کرد: نشانگر جابه‌جا شود
    [lat, lng].forEach(function (el) {
      el.addEventListener("change", function () {
        var a = parseFloat(lat.value), b = parseFloat(lng.value);
        if (isFinite(a) && isFinite(b)) { set(L.latLng(a, b)); map.panTo([a, b]); }
      });
    });
    // ویزارد قدم‌ها را پنهان/نمایان می‌کند؛ وقتی نقشه دیده شد اندازه‌اش را دوباره حساب کن
    if (window.IntersectionObserver) new IntersectionObserver(function (en) { if (en[0].isIntersecting) map.invalidateSize(); }).observe(box);
  });

  // صفحه اصلی: کارت‌های «نزدیک شما» بدون فرم فیلتر
  if (!filtersForm && params.get("near")) locate(null);
  // موقعیت ذخیره‌شده: بدون پرسیدن دوباره، کارت‌ها بر اساس فاصله مرتب شوند (در صفحه اصلی)
  if (window.BellaLoc && BellaLoc.get()) useLoc(BellaLoc.get(), !filtersForm);
})();
