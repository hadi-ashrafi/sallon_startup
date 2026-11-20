// تقویم شمسی برای فیلدهای تاریخ: <input data-jdate> (اختیاری: data-jdate-max="today" برای تاریخ تولد).
// با زدن روی فیلد پنجره‌ای باز می‌شود: اول سال، بعد ماه، بعد روز (برای تاریخ تولد که سالش دور است راحت‌تر از ورق زدن ماه‌هاست).
// اگر فیلد مقدار داشته باشد، مستقیم روزهای همان ماه نشان داده می‌شود و با زدن عنوان می‌شود سال و ماه را عوض کرد.
// مقدار به شکل «۱۳۷۵/۰۵/۲۰» در همان فیلد نوشته می‌شود (بک‌اند با fa.ParseJalali می‌خواند). موبایل: برگه از پایین صفحه.
(function () {
  "use strict";

  // ---------- تبدیل تاریخ شمسی و میلادی (الگوریتم jalaali) ----------
  function div(a, b) { return ~~(a / b); }
  function mod(a, b) { return a - ~~(a / b) * b; }
  function jalCal(jy) {
    var breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
    var gy = jy + 621, leapJ = -14, jp = breaks[0], jm, jump = 0, n, i;
    for (i = 1; i < breaks.length; i++) {
      jm = breaks[i];
      jump = jm - jp;
      if (jy < jm) break;
      leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
      jp = jm;
    }
    n = jy - jp;
    leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
    if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
    var leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
    var march = 20 + leapJ - leapG;
    if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
    var leap = mod(mod(n + 1, 33) - 1, 4);
    if (leap === -1) leap = 4;
    return { leap: leap, gy: gy, march: march };
  }
  function g2d(gy, gm, gd) {
    var d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
    return d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  }
  function d2g(jdn) {
    var j = 4 * jdn + 139361631;
    j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
    var i = div(mod(j, 1461), 4) * 5 + 308;
    var gd = div(mod(i, 153), 5) + 1, gm = mod(div(i, 153), 12) + 1;
    return { gy: div(j, 1461) - 100100 + div(8 - gm, 6), gm: gm, gd: gd };
  }
  function j2d(jy, jm, jd) { var r = jalCal(jy); return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1; }
  function d2j(jdn) {
    var gy = d2g(jdn).gy, jy = gy - 621, r = jalCal(jy), k = jdn - g2d(gy, 3, r.march);
    if (k >= 0) {
      if (k <= 185) return { jy: jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
      k -= 186;
    } else {
      jy -= 1;
      k += 179;
      if (r.leap === 1) k += 1;
    }
    return { jy: jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
  }
  function monthLength(jy, jm) { return jm <= 6 ? 31 : jm <= 11 ? 30 : (jalCal(jy).leap === 0 ? 30 : 29); }
  function weekdayOfFirst(jy, jm) { var g = d2g(j2d(jy, jm, 1)); return (new Date(g.gy, g.gm - 1, g.gd).getDay() + 1) % 7; } // شنبه = ۰
  function todayJ() { var t = new Date(); return d2j(g2d(t.getFullYear(), t.getMonth() + 1, t.getDate())); }

  var MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
  var WEEK = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
  var fa = function (n) { return String(n).replace(/\d/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹"[d]; }); };
  var latin = function (s) { return String(s || "").replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 0x06f0); }); };
  var pad = function (n) { return n < 10 ? "0" + n : String(n); };
  var SPRITE = ((document.querySelector('link[rel="icon"]') || {}).href || "assets/img/favicon.svg").replace(/favicon\.svg.*$/, "icons.svg");
  var icon = function (n) { return '<svg class="icon ph" aria-hidden="true"><use href="' + SPRITE + "#" + n + '"/></svg>'; };
  var mobile = window.matchMedia("(max-width: 640px)");

  function parse(v) {
    var p = latin(v).split(/[\/\-.]/).map(Number);
    if (p.length !== 3 || !p[0] || p[1] < 1 || p[1] > 12 || p[2] < 1 || p[2] > monthLength(p[0], p[1])) return null;
    return { jy: p[0], jm: p[1], jd: p[2] };
  }

  // ---------- پنجره (یکی برای همه فیلدها) ----------
  var box = null, backdrop = null, input = null, view = null, mode = "days", sel = null, max = null;
  function build() {
    backdrop = document.createElement("div");
    backdrop.className = "jdp__backdrop";
    backdrop.addEventListener("click", close);
    box = document.createElement("div");
    box.className = "jdp";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "انتخاب تاریخ");
    box.hidden = true;
    box.innerHTML =
      '<div class="jdp__head">' +
      '<button type="button" class="jdp__nav" data-jdp-prev aria-label="قبلی">' + icon("chev-right") + "</button>" +
      '<button type="button" class="jdp__title" data-jdp-title></button>' +
      '<button type="button" class="jdp__nav" data-jdp-next aria-label="بعدی">' + icon("chev-left") + "</button></div>" +
      '<div class="jdp__body" data-jdp-body></div>' +
      '<div class="jdp__foot"><button type="button" class="btn btn-ghost btn-sm" data-jdp-clear>پاک کردن</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-jdp-close>بستن</button></div>';
    document.body.append(backdrop, box);
    box.querySelector("[data-jdp-prev]").addEventListener("click", function () { step(-1); });
    box.querySelector("[data-jdp-next]").addEventListener("click", function () { step(1); });
    box.querySelector("[data-jdp-title]").addEventListener("click", function () { mode = mode === "days" ? "months" : "years"; render(); });
    box.querySelector("[data-jdp-close]").addEventListener("click", close);
    box.querySelector("[data-jdp-clear]").addEventListener("click", function () { set(""); close(); });
    box.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.preventDefault(); close(); } });
  }
  function step(dir) {
    if (mode === "days") {
      view.jm += dir;
      if (view.jm < 1) { view.jm = 12; view.jy--; }
      if (view.jm > 12) { view.jm = 1; view.jy++; }
    } else if (mode === "months") view.jy += dir;
    else view.jy += dir * 20;
    render();
  }
  function after(jy, jm, jd) { // بعد از حداکثر مجاز (مثلاً تاریخ تولد در آینده)؟
    if (!max) return false;
    return jy > max.jy || (jy === max.jy && (jm > max.jm || (jm === max.jm && jd > max.jd)));
  }
  function cell(label, onPick, opts) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "jdp__cell" + (opts.cls ? " " + opts.cls : "");
    b.textContent = label;
    if (opts.selected) b.setAttribute("aria-pressed", "true");
    if (opts.disabled) b.disabled = true;
    b.addEventListener("click", onPick);
    return b;
  }
  function render() {
    var body = box.querySelector("[data-jdp-body]"), title = box.querySelector("[data-jdp-title]");
    body.innerHTML = "";
    body.className = "jdp__body jdp__body--" + mode;
    if (mode === "years") {
      var start = view.jy - ((view.jy - 1) % 20); // بازه ۲۰ ساله‌ای که سال نمایش‌داده را دارد
      title.textContent = fa(start) + " تا " + fa(start + 19);
      for (var y = start; y < start + 20; y++) {
        (function (yy) {
          body.appendChild(cell(fa(yy), function () { view.jy = yy; mode = "months"; render(); },
            { selected: sel && sel.jy === yy, disabled: max && yy > max.jy, cls: yy === todayJ().jy ? "is-today" : "" }));
        })(y);
      }
    } else if (mode === "months") {
      title.textContent = "سال " + fa(view.jy);
      MONTHS.forEach(function (name, i) {
        body.appendChild(cell(name, function () { view.jm = i + 1; mode = "days"; render(); },
          { selected: sel && sel.jy === view.jy && sel.jm === i + 1, disabled: after(view.jy, i + 1, 1) }));
      });
    } else {
      title.textContent = MONTHS[view.jm - 1] + " " + fa(view.jy);
      WEEK.forEach(function (w) { var s = document.createElement("span"); s.className = "jdp__wd"; s.textContent = w; body.appendChild(s); });
      for (var i = 0; i < weekdayOfFirst(view.jy, view.jm); i++) body.appendChild(document.createElement("span"));
      var t = todayJ();
      for (var d = 1; d <= monthLength(view.jy, view.jm); d++) {
        (function (dd) {
          body.appendChild(cell(fa(dd), function () { set(view.jy + "/" + pad(view.jm) + "/" + pad(dd)); close(); }, {
            selected: sel && sel.jy === view.jy && sel.jm === view.jm && sel.jd === dd,
            disabled: after(view.jy, view.jm, dd),
            cls: t.jy === view.jy && t.jm === view.jm && t.jd === dd ? "is-today" : ""
          }));
        })(d);
      }
    }
    var focusEl = body.querySelector('[aria-pressed="true"]') || body.querySelector(".jdp__cell:not(:disabled)");
    if (focusEl) focusEl.focus({ preventScroll: true });
  }
  function set(v) {
    input.value = v ? fa(v) : "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function place() {
    box.classList.toggle("is-sheet", mobile.matches);
    if (mobile.matches) { box.style.cssText = ""; return; }
    var r = input.getBoundingClientRect();
    box.style.top = Math.min(r.bottom + 6, innerHeight - box.offsetHeight - 8) + "px";
    box.style.right = Math.max(8, innerWidth - r.right) + "px";
  }
  function open(el) {
    if (!box) build();
    input = el;
    sel = parse(el.value);
    max = el.dataset.jdateMax === "today" ? todayJ() : null;
    var t = todayJ();
    view = sel ? { jy: sel.jy, jm: sel.jm } : { jy: max ? t.jy - 25 : t.jy, jm: max ? 1 : t.jm };
    mode = sel || !max ? "days" : "years"; // تاریخ تولد خالی: از انتخاب سال شروع کن
    box.hidden = false;
    backdrop.classList.add("is-open");
    render();
    place();
    requestAnimationFrame(function () { box.classList.add("is-open"); });
  }
  function close() {
    if (!box || box.hidden) return;
    box.classList.remove("is-open");
    box.hidden = true;
    backdrop.classList.remove("is-open");
    if (input) input.focus({ preventScroll: true });
  }

  document.querySelectorAll("input[data-jdate]").forEach(function (el) {
    el.readOnly = true; // روی گوشی صفحه‌کلید باز نشود؛ تاریخ از تقویم انتخاب می‌شود
    el.setAttribute("inputmode", "none");
    el.classList.add("jdp-input");
    el.addEventListener("click", function () { open(el); });
    el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") { e.preventDefault(); open(el); } });
  });
  addEventListener("resize", function () { if (box && !box.hidden) place(); });

  window.BellaDate = { toJalali: function (y, m, d) { return d2j(g2d(y, m, d)); }, toGregorian: function (jy, jm, jd) { return d2g(j2d(jy, jm, jd)); }, monthLength: monthLength };
})();
