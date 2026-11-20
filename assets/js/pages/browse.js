// اسکرول افقی و انتخاب بر اساس دسته‌بندی.
//   [data-carousel] + دکمه‌های [data-car-prev] / [data-car-next] (aria-controls = id نوار): هر بار یک صفحه کارت جابه‌جا می‌شود؛
//     با کشیدن انگشت، چرخ موس افقی و کلیدهای چپ/راست هم کار می‌کند. دکمه‌ها در ابتدا/انتهای نوار غیرفعال می‌شوند.
//   [data-home-filter] (صفحه اصلی): خدمت (category) و مرتب‌سازی (sort) کارت‌های [data-near-list].
//   [data-cat-filter="id"] (صفحه سالن): همان رفتار برای ردیف‌های <li data-cats> منوی خدمات؛ data-cat="" یعنی همه.
(function () {
  "use strict";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ---------- اسکرول افقی ----------
  // در صفحه راست‌به‌چپ، scrollLeft از ۰ به سمت منفی می‌رود؛ «بعدی» یعنی رفتن به چپ.
  $$("[data-carousel]").forEach(function (track) {
    var prev = $('[data-car-prev][aria-controls="' + track.id + '"]'), next = $('[data-car-next][aria-controls="' + track.id + '"]');
    var step = function () { return Math.max(track.clientWidth * 0.85, 220); };
    function go(dir) { track.scrollBy({ left: -dir * step(), behavior: "smooth" }); }
    function sync() {
      var max = track.scrollWidth - track.clientWidth, pos = Math.abs(track.scrollLeft);
      if (prev) prev.disabled = pos < 4;
      if (next) next.disabled = pos > max - 4;
    }
    if (prev) prev.addEventListener("click", function () { go(-1); });
    if (next) next.addEventListener("click", function () { go(1); });
    track.addEventListener("scroll", sync, { passive: true });
    track.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); go(1); }
      if (e.key === "ArrowRight") { e.preventDefault(); go(-1); }
    });
    // کشیدن با موس در دسکتاپ
    var down = null;
    track.addEventListener("pointerdown", function (e) { if (e.pointerType === "mouse") down = { x: e.clientX, left: track.scrollLeft, moved: false }; });
    window.addEventListener("pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - down.x;
      if (Math.abs(dx) > 5) { down.moved = true; track.classList.add("is-dragging"); }
      track.scrollLeft = down.left - dx;
    });
    window.addEventListener("pointerup", function () { if (down) { setTimeout(function () { track.classList.remove("is-dragging"); }, 0); down = null; } });
    track.addEventListener("click", function (e) { if (track.classList.contains("is-dragging")) { e.preventDefault(); e.stopPropagation(); } }, true);
    window.addEventListener("resize", sync);
    sync();
  });

  // ---------- فیلتر دسته‌ها ----------
  function bindPills(pills, items, onPick) {
    function pick(btn) {
      var cat = btn.dataset.cat, shown = 0;
      pills.forEach(function (b) { b.setAttribute("aria-selected", String(b === btn)); });
      items().forEach(function (it) {
        var ok = !cat || (it.dataset.cats || "").split(",").indexOf(cat) > -1;
        it.hidden = !ok;
        if (ok) shown++;
      });
      if (onPick) onPick(cat, shown, btn);
    }
    pills.forEach(function (b) { b.addEventListener("click", function () { pick(b); }); });
    var first = pills.filter(function (b) { return b.getAttribute("aria-selected") === "true"; })[0] || pills[0];
    if (first) pick(first);
  }

  // ---------- «سالن‌های نزدیک من» صفحه اصلی: یک فیلتر خدمت + مرتب‌سازی ----------
  // فاصله هر کارت (data-km) را pages/salons.js با موقعیت کاربر می‌گذارد؛ بدون موقعیت، «نزدیک‌ترین» مثل «پرطرفدارترین» است.
  var SORTS = {
    near: function (a, b) { return ((+a.dataset.km || 1e9) - (+b.dataset.km || 1e9)) || (b.dataset.reviews - a.dataset.reviews); },
    popular: function (a, b) { return b.dataset.reviews - a.dataset.reviews; },
    top: function (a, b) { return (b.dataset.rating - a.dataset.rating) || (b.dataset.reviews - a.dataset.reviews); },
    cheap: function (a, b) { return a.dataset.price - b.dataset.price; },
    expensive: function (a, b) { return b.dataset.price - a.dataset.price; }
  };
  $$("[data-home-filter]").forEach(function (box) {
    var list = $("[data-near-list]", box), empty = $("[data-near-empty]", box);
    var cat = $("[name=category]", box), sort = $("[name=sort]", box);
    function apply() {
      var shown = 0;
      var cards = $$("[data-salon]", list);
      cards.forEach(function (c) {
        var ok = !cat.value || c.dataset.cats.split(",").indexOf(cat.value) > -1;
        c.hidden = !ok;
        if (ok) shown++;
      });
      cards.sort(SORTS[sort.value] || SORTS.near).forEach(function (c) { list.appendChild(c); });
      if (empty) empty.hidden = shown > 0;
      list.scrollLeft = 0;
      list.dispatchEvent(new Event("scroll")); // دکمه‌های چپ و راست نوار به‌روز شوند
    }
    cat.addEventListener("change", apply);
    sort.addEventListener("change", apply);
    // موقعیت که رسید (یا عوض شد) فاصله‌ها تازه‌اند؛ دوباره مرتب کن
    document.addEventListener("bella:location", function () { setTimeout(apply, 0); });
    setTimeout(apply, 0);
  });

  $$("[data-cat-filter]").forEach(function (box) {
    var list = document.getElementById(box.dataset.catFilter);
    if (list) bindPills($$(".cat-pill", box), function () { return $$("[data-cats]", list); });
  });

  // پنجره‌ها (مثلاً «همه خدمات» در صفحه اصلی): [data-dialog-open="id"] باز، [data-dialog-close] یا زدن بیرون پنجره بسته
  document.addEventListener("click", function (e) {
    var open = e.target.closest("[data-dialog-open]");
    if (open) { var d = document.getElementById(open.dataset.dialogOpen); if (d && !d.open) d.showModal(); return; }
    var close = e.target.closest("[data-dialog-close]");
    if (close) { close.closest("dialog").close(); return; }
    if (e.target.matches("dialog.sheet[open]")) e.target.close(); // فقط پنجره‌های پایین‌رو؛ پنجره اجازه موقعیت نه
  });

  // کاشی دسته (صفحه سالن): همان دسته را در منوی خدمات انتخاب و به آن اسکرول کن
  document.addEventListener("click", function (e) {
    var tile = e.target.closest("[data-cat-jump]");
    if (!tile) return;
    var pill = $('[data-cat-filter] .cat-pill[data-cat="' + tile.dataset.catJump + '"]');
    if (!pill) return;
    e.preventDefault();
    pill.click();
    $$("[data-cat-jump]").forEach(function (t) { t.classList.toggle("is-active", t === tile); });
    var target = document.getElementById("services-menu");
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
