// موقعیت کاربر: شهر و مختصات پیش‌فرض همه صفحه‌ها.
//   ورود اول به صفحه اصلی (<body data-loc-gate>): پنجره درخواست دسترسی به موقعیت مکانی.
//     قبول → نزدیک‌ترین شهر انتخاب و سالن‌ها بر اساس فاصله مرتب می‌شوند.
//     رد یا خطا → پنجره «دسترسی به موقعیت مکانی» (راهنمای روشن کردن دسترسی) باز می‌شود و با «تایید» بسته می‌شود.
//     برای کسی که اجازه نداده، در صفحه اصلی هر بار باز کردن سایت (یک بار در هر نشست) همین پنجره نشان داده می‌شود.
//   [data-loc-open] (دکمه موقعیت در سربرگ) پنجره را دوباره باز می‌کند؛ [data-loc-city] نام شهر را نشان می‌دهد.
//   [data-loc-request] دوباره اجازه می‌گیرد؛ <select data-loc-select> شهر را دستی عوض می‌کند.
//   نتیجه در localStorage (bella.loc) می‌ماند و رویداد «bella:location» با {city, lat, lng, mode} فرستاده می‌شود.
// حریم خصوصی: مختصات فقط روی همین دستگاه می‌ماند و به سرور فرستاده نمی‌شود.
(function () {
  "use strict";

  var KEY = "bella.loc";
  // آیکن از فایل یکسان آیکن‌های سایت (کنار favicon)
  var SPRITE = ((document.querySelector('link[rel="icon"]') || {}).href || "assets/img/favicon.svg").replace(/favicon\.svg.*$/, "icons.svg");
  function svgIcon(name, cls) { return '<svg class="' + (cls ? cls + " " : "") + 'ph" aria-hidden="true"><use href="' + SPRITE + "#" + name + '"/></svg>'; }
  var CITIES = [
    { name: "تهران", lat: 35.6892, lng: 51.389 }, { name: "کرج", lat: 35.84, lng: 50.9391 },
    { name: "اصفهان", lat: 32.6546, lng: 51.668 }, { name: "شیراز", lat: 29.5918, lng: 52.5837 },
    { name: "مشهد", lat: 36.2605, lng: 59.6168 }, { name: "تبریز", lat: 38.08, lng: 46.2919 }
  ];
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function read() { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } }
  function write(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* حالت خصوصی */ } }

  function km(a, b) {
    var r = Math.PI / 180, x = Math.sin((b.lat - a.lat) * r / 2), y = Math.sin((b.lng - a.lng) * r / 2);
    return 12742 * Math.asin(Math.sqrt(x * x + Math.cos(a.lat * r) * Math.cos(b.lat * r) * y * y));
  }
  function nearestCity(p) {
    return CITIES.reduce(function (best, c) { return km(p, c) < km(p, best) ? c : best; }, CITIES[0]);
  }

  var state = read();

  function render() {
    var city = state ? state.city : "انتخاب شهر";
    $$("[data-loc-city]").forEach(function (el) { el.textContent = city; });
    $$("[data-loc-select], select[name=city]").forEach(function (sel) {
      if (state && Array.prototype.some.call(sel.options, function (o) { return o.text === state.city; })) {
        sel.value = state.city;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    $$("[data-loc-mode]").forEach(function (el) {
      el.textContent = !state ? "" : state.mode === "gps" ? "از موقعیت دقیق شما" : state.mode === "manual" ? "شهر را دستی انتخاب کرده‌اید" : "دسترسی به موقعیت داده نشده";
    });
  }
  function save(v) {
    state = v;
    write(v);
    render();
    document.dispatchEvent(new CustomEvent("bella:location", { detail: v }));
  }

  // ---------- درخواست موقعیت ----------
  function request() {
    return new Promise(function (resolve) {
      if (!navigator.geolocation) { save({ city: (state && state.city) || "تهران", mode: "denied" }); return resolve(state); }
      navigator.geolocation.getCurrentPosition(function (pos) {
        var p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        save({ city: nearestCity(p).name, lat: p.lat, lng: p.lng, mode: "gps", at: Date.now() });
        resolve(state);
      }, function () {
        save({ city: (state && state.city) || "تهران", mode: "denied" });
        resolve(state);
      }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 });
    });
  }

  // ---------- پنجره ورود ----------
  var dialog = null;
  function buildDialog() {
    dialog = document.createElement("dialog");
    dialog.className = "loc-gate";
    dialog.setAttribute("aria-labelledby", "loc-gate-title");
    var cities = CITIES.map(function (c) { return '<button type="button" class="loc-gate__city" data-gate-city="' + c.name + '" aria-pressed="false">' + c.name + "</button>"; }).join("");
    dialog.innerHTML =
      '<div class="loc-gate__art" aria-hidden="true"><span class="loc-gate__ring"></span><span class="loc-gate__ring loc-gate__ring--2"></span>' +
      svgIcon("pin", "icon") + '</div>' +
      '<h2 id="loc-gate-title">سالن‌های نزدیک شما را پیدا کنیم؟</h2>' +
      "<p>برای نمایش نزدیک‌ترین سالن‌ها و انتخاب خودکار شهرتان، اجازه دسترسی به موقعیت مکانی را بدهید. موقعیت شما فقط روی همین دستگاه می‌ماند.</p>" +
      '<button type="button" class="btn btn-primary btn-lg btn-block" data-gate-allow>اجازه دسترسی به موقعیت</button>' +
      '<div class="loc-gate__or"><span>یا شهر را خودتان انتخاب کنید</span></div>' +
      '<div class="loc-gate__cities" role="group" aria-label="انتخاب شهر">' + cities + "</div>" +
      '<p class="loc-gate__state" data-gate-state aria-live="polite"></p>';
    document.body.appendChild(dialog);
    dialog.addEventListener("cancel", function (e) { if (!state) { e.preventDefault(); } });
    dialog.querySelector("[data-gate-allow]").addEventListener("click", function () {
      var b = this;
      b.disabled = true;
      dialog.querySelector("[data-gate-state]").textContent = "در حال پیدا کردن موقعیت شما…";
      request().then(function (s) {
        b.disabled = false;
        dialog.close();
        if (s.mode !== "gps") showHelp();
        else if (window.SalonUI) SalonUI.toast("شهر شما: " + s.city);
      });
    });
    dialog.querySelectorAll("[data-gate-city]").forEach(function (b) {
      b.addEventListener("click", function () {
        save({ city: b.dataset.gateCity, mode: "manual" });
        dialog.close();
      });
    });
  }
  function openGate() {
    if (!dialog) buildDialog();
    dialog.querySelectorAll("[data-gate-city]").forEach(function (b) { b.setAttribute("aria-pressed", String(Boolean(state) && b.dataset.gateCity === state.city)); });
    dialog.querySelector("[data-gate-state]").textContent = state && state.mode === "denied"
      ? "قبلاً اجازه داده نشد؛ اگر مرورگر دوباره نپرسید، از تنظیمات سایت اجازه را روشن کنید." : "";
    if (!dialog.open) dialog.showModal();
  }
  // ---------- پنجره «دسترسی به موقعیت مکانی» (بعد از رد اجازه) ----------
  var help = null;
  function showHelp() {
    if (!help) {
      help = document.createElement("dialog");
      help.className = "loc-gate loc-help";
      help.setAttribute("aria-labelledby", "loc-help-title");
      help.innerHTML =
        '<div class="loc-gate__art" aria-hidden="true">' + svgIcon("locate", "icon") + "</div>" +
        '<h2 id="loc-help-title">دسترسی به موقعیت مکانی</h2>' +
        "<p>بدون موقعیت شما نمی‌توانیم نزدیک‌ترین سالن‌ها را نشان دهیم؛ فعلاً سالن‌های <b data-loc-city></b> نمایش داده می‌شود.</p>" +
        '<ol class="loc-help__steps">' +
        "<li>روی آیکن " + svgIcon("lock", "icon") + " کنار نشانی سایت در مرورگر بزنید.</li>" +
        "<li>«موقعیت مکانی» یا Location را روی «اجازه» بگذارید.</li>" +
        "<li>دکمه «دوباره امتحان کن» را بزنید.</li></ol>" +
        '<div class="loc-help__actions">' +
        '<button type="button" class="btn btn-primary" data-help-ok>تایید</button>' +
        '<button type="button" class="btn btn-ghost" data-help-retry>' + svgIcon("locate", "icon") + "دوباره امتحان کن</button></div>";
      document.body.appendChild(help);
      help.querySelector("[data-help-ok]").addEventListener("click", function () { help.close(); });
      help.querySelector("[data-help-retry]").addEventListener("click", function () {
        help.close();
        request().then(function (s) {
          if (s.mode === "gps") { if (window.SalonUI) SalonUI.toast("موقعیت پیدا شد: " + s.city); }
          else showHelp();
        });
      });
    }
    render();
    try { sessionStorage.setItem("bella.loc.help", "1"); } catch (e) { /* حالت خصوصی */ }
    if (!help.open) help.showModal();
  }

  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-loc-open]")) { e.preventDefault(); openGate(); }
    var req = e.target.closest("[data-loc-request]");
    if (req) {
      e.preventDefault();
      req.setAttribute("aria-busy", "true");
      request().then(function (s) {
        req.removeAttribute("aria-busy");
        if (s.mode === "gps") { if (window.SalonUI) SalonUI.toast("موقعیت پیدا شد: " + s.city); }
        else showHelp();
      });
    }
  });
  document.addEventListener("change", function (e) {
    var sel = e.target.closest("[data-loc-select]");
    if (sel && (!state || state.city !== sel.value)) save({ city: sel.value, mode: "manual" });
  });

  window.BellaLoc = { get: function () { return state; }, request: request, save: save, help: showHelp };

  render();
  // ورود اول به صفحه اصلی: پیش از هر چیز اجازه موقعیت را بپرس
  if (document.body.hasAttribute("data-loc-gate") && !state) setTimeout(openGate, 350);
  // کسی که اجازه نداده: در صفحه اصلی یک بار در هر نشست راهنما را ببیند (با «تایید» بسته می‌شود)
  var seenHelp = false;
  try { seenHelp = sessionStorage.getItem("bella.loc.help") === "1"; } catch (e) { seenHelp = true; }
  if (state && state.mode === "denied" && (location.hash === "#location-access" || (document.body.hasAttribute("data-loc-gate") && !seenHelp))) setTimeout(showHelp, 400);
})();
