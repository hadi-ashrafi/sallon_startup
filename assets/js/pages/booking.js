// صفحه رزرو نوبت: چهار قدم (خدمت ← آرایشگر ← زمان ← تأیید) با خلاصه زنده.
// جمع مبلغ برای نمایش است: اگر بک‌اند روی گزینه آرایشگر data-prices="شناسه:قیمت:دقیقه,…" گذاشته باشد همان قیمت‌های
// دقیق آرایشگر، وگرنه data-price خدمت × ضریب آرایشگر (data-factor). مبلغ نهایی، تخفیف و آزاد بودن ساعت را سرور
// دوباره حساب می‌کند. کد تخفیف با بک‌اند از سرور بررسی می‌شود (_act=applyCode).
(function () {
  "use strict";

  var form = document.querySelector("[data-booking]");
  if (!form) return;

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var panels = $$("[data-panel]", form);
  var steps = $$("[data-stepper] li");
  var prevBtn = $("[data-prev]", form);
  var nextBtn = $("[data-next]", form);
  var nextLabel = $("[data-next-label]", form);
  var summary = $("[data-summary]", form);
  var backdrop = $(".summary-backdrop", form);
  var depositPercent = Number(form.getAttribute("data-deposit-percent")) || 0;
  var NEXT_LABELS = ["انتخاب آرایشگر", "انتخاب زمان", "مرور نوبت", "ثبت و پرداخت بیعانه"];
  var current = 0;
  var onTimeStep = null; // ساعت انتخاب‌شده روی کارت سالن (پایین فایل را ببینید)
  var returnTo = null;   // از «مرور نوبت» برای ویرایش یک مورد آمده؛ بعد از آن مستقیم به مرور برگردد
  var pick = { date: "", time: "", dayLabel: "", timeLabel: "" };

  // ---------- قالب‌بندی فارسی ----------
  function number(n) { return n.toLocaleString("fa-IR"); }
  function price(n) { return number(n) + " تومان"; }
  function duration(m) {
    var h = Math.floor(m / 60), r = m % 60;
    if (!h) return number(r) + " دقیقه";
    return number(h) + " ساعت" + (r ? " و " + number(r) + " دقیقه" : "");
  }

  // ---------- وضعیت انتخاب‌ها ----------
  function chosen() { return $$("input[name=serviceIds]:checked", form); }
  function staffInput() { return $("input[name=staffId]:checked", form); }
  function factor() {
    var s = staffInput();
    var opt = s && s.closest("[data-factor]");
    return opt ? Number(opt.getAttribute("data-factor")) : 1;
  }
  // قیمت و مدت دقیق آرایشگر انتخاب‌شده (اگر بک‌اند داده باشد)
  function staffPrices() {
    var s = staffInput();
    var raw = s && s.closest("[data-prices]") && s.closest("[data-prices]").getAttribute("data-prices");
    if (!raw) return null;
    var map = {};
    raw.split(",").forEach(function (p) { var a = p.split(":"); map[a[0]] = { price: Number(a[1]), minutes: Number(a[2]) }; });
    return map;
  }
  var discount = 0; // مبلغ تخفیف تأییدشده از سرور برای همین انتخاب‌ها
  function totals() {
    var list = chosen();
    var map = staffPrices();
    var total, minutes;
    if (map && list.every(function (i) { return map[i.value]; })) {
      total = list.reduce(function (s, i) { return s + map[i.value].price; }, 0);
      minutes = list.reduce(function (s, i) { return s + map[i.value].minutes; }, 0);
    } else {
      var base = list.reduce(function (s, i) { return s + Number(i.getAttribute("data-price")); }, 0);
      total = Math.round((base * factor()) / 10000) * 10000;
      minutes = list.reduce(function (s, i) { return s + Number(i.getAttribute("data-duration")); }, 0);
    }
    total = Math.max(0, total - discount);
    return {
      list: list,
      total: total,
      minutes: minutes,
      deposit: Math.ceil((total * depositPercent) / 100 / 1000) * 1000
    };
  }

  // کلاس is-checked برای مرورگرهای قدیمی که :has() ندارند
  function syncChecked() {
    $$(".option input", form).forEach(function (i) { i.closest(".option").classList.toggle("is-checked", i.checked); });
  }

  // ---------- قدم ۱: خدمت‌ها ----------
  function renderPicked(list) {
    var box = $("[data-picked-chips]", form);
    box.innerHTML = "";
    list.forEach(function (input) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "picked-chip";
      chip.textContent = input.getAttribute("data-name");
      chip.setAttribute("aria-label", "حذف " + input.getAttribute("data-name"));
      chip.addEventListener("click", function () { input.checked = false; changed(); });
      box.appendChild(chip);
    });
    $$(".svc-pick", form).forEach(function (g) {
      var n = $$("input:checked", g).length;
      var badge = $("[data-cat-count]", g);
      badge.hidden = !n;
      badge.textContent = number(n);
    });
  }

  var search = $("[data-svc-search]", form);
  search.addEventListener("input", function () {
    var q = search.value.trim();
    var any = false;
    $$(".svc-pick", form).forEach(function (g) {
      var hits = 0;
      $$(".svc-option", g).forEach(function (o) {
        var ok = !q || o.getAttribute("data-search").indexOf(q) !== -1;
        o.hidden = !ok;
        if (ok) hits++;
      });
      g.hidden = !hits;
      if (q && hits) g.open = true;
      if (hits) any = true;
    });
    $("[data-search-empty]", form).hidden = any;
  });

  $$("[data-jump]", form).forEach(function (btn) {
    btn.addEventListener("click", function () {
      var g = $("#pick-" + btn.getAttribute("data-jump"), form);
      search.value = "";
      search.dispatchEvent(new Event("input"));
      g.open = true;
      g.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // ---------- قدم ۲: فقط آرایشگرهایی که همه خدمات را انجام می‌دهند ----------
  function refreshStaff(list) {
    var ids = list.map(function (i) { return i.value; });
    var eligible = 0;
    $$("[data-staff-option]", form).forEach(function (opt) {
      var offers = opt.getAttribute("data-services").split(",");
      var ok = ids.every(function (id) { return offers.indexOf(id) !== -1; });
      var input = $("input", opt);
      input.disabled = !ok;
      opt.classList.toggle("is-disabled", !ok);
      $("[data-staff-note]", opt).textContent = ok ? "" : "این خدمت را ندارد";
      if (!ok && input.checked) $("input[name=staffId][value='']", form).checked = true;
      if (ok) eligible++;
    });
    $("[data-no-staff]", form).hidden = eligible > 0 || !ids.length;
  }

  // ---------- رزرو با یک آرایشگر مشخص (?staff=N، از صفحه آرایشگر یا تیم سالن) ----------
  // آرایشگر از اول انتخاب است، فقط خدماتی که او انجام می‌دهد نمایش داده می‌شود و قدم «آرایشگر» رد می‌شود؛
  // با «تغییر خدمات» در مرور نوبت هم همین فهرست می‌ماند. «آرایشگر دیگر» این حالت را برمی‌دارد.
  var locked = null; // <label data-staff-option> آرایشگر قفل‌شده
  var lockBanner = null;
  function lockStaff(id) {
    var opt = $('[data-staff-option="' + id + '"]', form);
    var input = opt && $("input[name=staffId]", opt);
    if (!input) return; // این آرایشگر در این سالن نیست؛ رزرو معمولی
    locked = opt;
    var offers = opt.getAttribute("data-services").split(",");
    $$(".svc-option", form).forEach(function (o) {
      var svc = $("input[name=serviceIds]", o);
      var out = offers.indexOf(svc.value) === -1;
      o.classList.toggle("is-locked-out", out);
      if (out && svc.checked) svc.checked = false;
    });
    $$(".svc-pick", form).forEach(function (g) { g.classList.toggle("is-locked-out", !$(".svc-option:not(.is-locked-out)", g)); });
    $$("[data-jump]", form).forEach(function (b) {
      var g = $("#pick-" + b.getAttribute("data-jump"), form);
      b.classList.toggle("is-locked-out", Boolean(g) && g.classList.contains("is-locked-out"));
    });
    input.checked = true;
    var name = input.getAttribute("data-name");
    var first = name.split(" ")[0];
    var count = $$(".svc-option:not(.is-locked-out)", form).length;
    lockBanner = document.createElement("div");
    lockBanner.className = "staff-lock";
    lockBanner.setAttribute("role", "status");
    var av = $(".avatar", opt);
    lockBanner.innerHTML = (av ? av.outerHTML : "") +
      '<div class="staff-lock__text"><b></b><small></small></div>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-staff-unlock>آرایشگر دیگر</button>';
    $("b", lockBanner).textContent = "رزرو با " + name;
    $("small", lockBanner).textContent = "فقط " + number(count) + " خدمتی که " + first + " انجام می‌دهد نمایش داده می‌شود؛ انتخاب آرایشگر لازم نیست.";
    form.parentNode.insertBefore(lockBanner, form);
    $("[data-staff-unlock]", lockBanner).addEventListener("click", unlockStaff);
    var label = $(".stepper__label", steps[1]);
    if (label) { label.setAttribute("data-default", label.textContent); label.textContent = first; }
    steps[1].classList.add("is-locked");
    NEXT_LABELS[0] = "انتخاب زمان";
    refreshStaff(chosen());
    update();
  }
  function clearLock() {
    if (!locked) return;
    $$(".is-locked-out", form).forEach(function (el) { el.classList.remove("is-locked-out"); });
    locked = null;
    if (lockBanner) { lockBanner.remove(); lockBanner = null; }
    var label = $(".stepper__label", steps[1]);
    if (label && label.getAttribute("data-default")) label.textContent = label.getAttribute("data-default");
    steps[1].classList.remove("is-locked");
    NEXT_LABELS[0] = "انتخاب آرایشگر";
  }
  function unlockStaff() {
    clearLock();
    $('input[name=staffId][value=""]', form).checked = true;
    keepTime();
    update();
    show(chosen().length ? 1 : 0, true); // حالا آرایشگر را خودش انتخاب کند
  }
  // قدم بعدی/قبلی: وقتی آرایشگر قفل است، قدم «آرایشگر» رد می‌شود
  function stepAfter(from, dir) {
    var to = from + dir;
    if (locked && to === 1) to += dir;
    return to;
  }

  // ---------- خلاصه ----------
  function setSum(key, text) { $$('[data-sum="' + key + '"]', form).forEach(function (el) { el.textContent = text; }); }

  function update() {
    var t = totals();
    var any = t.list.length > 0;
    syncChecked();
    renderPicked(t.list);
    setSum("services", any ? t.list.map(function (i) { return i.getAttribute("data-name"); }).join("، ") : "انتخاب نشده");
    setSum("staff", staffInput() ? staffInput().getAttribute("data-name") : "فرقی نمی‌کند");
    setSum("time", pick.date ? pick.dayLabel + "، ساعت " + (pick.timeLabel || "انتخاب نشده") : "انتخاب نشده");
    setSum("duration", any ? duration(t.minutes) : "-");
    setSum("final", any ? price(t.total) : "-");
    setSum("discount", discount ? "−" + price(discount) : "-");
    $$("[data-discount-row]", form).forEach(function (dt) {
      dt.hidden = !discount;
      if (dt.nextElementSibling) dt.nextElementSibling.hidden = !discount;
    });
    setSum("deposit", any ? (t.deposit ? price(t.deposit) : "ندارد") : "-");
    // روش پرداخت: آنلاین کامل یا بیعانه + پرداخت بقیه در سالن
    var method = $('[name="paymentMethod"]:checked', form);
    var cash = method && method.value === "cash";
    setSum("paynow", any ? price(cash ? t.deposit : t.total) : "-");
    setSum("paylater", any ? (cash ? price(t.total - t.deposit) : "ندارد") : "-");

    $("[data-bar-time]", form).textContent = !any ? "هنوز خدمتی انتخاب نشده"
      : pick.time ? pick.dayLabel + "، " + pick.timeLabel
      : number(t.list.length) + " خدمت، " + duration(t.minutes);
    $("[data-bar-final]", form).textContent = any ? price(t.total) : "";
    validate();
  }

  // ---------- مراحل ----------
  var canLeave = [
    function () { return chosen().length > 0; },
    function () { return true; },
    function () { return Boolean(pick.date && pick.time); },
    function () { return true; }
  ];
  var hints = ["دست‌کم یک خدمت انتخاب کنید", "", "روز و ساعت را انتخاب کنید", ""];

  function validate() {
    var ok = canLeave[current]();
    nextBtn.disabled = !ok;
    nextBtn.title = ok ? "" : hints[current];
  }

  function show(step, focus) {
    current = Math.max(0, Math.min(step, panels.length - 1));
    panels.forEach(function (p, i) { p.hidden = i !== current; });
    steps.forEach(function (li, i) {
      li.classList.toggle("is-done", i < current);
      if (i === current) li.setAttribute("aria-current", "step");
      else li.removeAttribute("aria-current");
    });
    prevBtn.hidden = current === 0;
    if (current === 2 && onTimeStep) onTimeStep();
    if (returnTo !== null && current >= returnTo) returnTo = null;
    nextLabel.textContent = returnTo !== null ? "ذخیره و بازگشت به مرور" : NEXT_LABELS[current];
    nextBtn.classList.toggle("is-final", current === panels.length - 1);
    validate();
    if (focus) {
      var top = $(".booking-head").getBoundingClientRect().top + window.pageYOffset - 90;
      window.scrollTo(0, Math.max(0, top));
      var h = $("h2", panels[current]);
      h.tabIndex = -1;
      h.focus({ preventScroll: true });
    }
  }

  // فقط به مرحله‌هایی می‌شود پرید که قدم‌های قبلشان کامل است
  function reachable(step) { for (var i = 0; i < step; i++) if (!canLeave[i]()) return false; return true; }

  nextBtn.addEventListener("click", function () {
    if (!canLeave[current]()) return;
    if (current === panels.length - 1) {
      if (form.requestSubmit) form.requestSubmit(); else form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    } else if (returnTo !== null && reachable(returnTo)) {
      show(returnTo, true); // بقیه انتخاب‌ها هنوز درست است؛ مستقیم به مرور نوبت
    } else show(stepAfter(current, 1), true);
  });
  prevBtn.addEventListener("click", function () { show(stepAfter(current, -1), true); });
  $$("[data-goto]", form).forEach(function (b) {
    b.addEventListener("click", function () {
      if (current === panels.length - 1) returnTo = current; // «تغییر» در مرور نوبت
      show(Number(b.getAttribute("data-goto")), true);
    });
  });
  steps.forEach(function (li) {
    li.tabIndex = 0;
    li.setAttribute("role", "button");
    function go() { var s = Number(li.getAttribute("data-step")); if (reachable(s)) show(s, true); }
    li.addEventListener("click", go);
    li.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
  });

  // ---------- خلاصه بازشونده در موبایل ----------
  function toggleSummary(open) {
    var isOpen = open === undefined ? !summary.classList.contains("is-open") : open;
    summary.classList.toggle("is-open", isOpen);
    backdrop.hidden = !isOpen;
    $$("[aria-controls=booking-summary]", form).forEach(function (b) { b.setAttribute("aria-expanded", String(isOpen)); });
  }
  $$("[data-summary-toggle]", form).forEach(function (b) { b.addEventListener("click", function () { toggleSummary(); }); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") toggleSummary(false); });

  // ---------- رویدادها ----------
  var picker = window.SalonSlotPicker.mount(form, function (p) { pick = p; update(); });
  function clearDiscount() {
    if (!discount) return;
    discount = 0;
    var msg = $("[data-code-message]", form);
    if (msg) msg.textContent = "انتخاب‌ها عوض شد؛ کد تخفیف را دوباره اعمال کنید.";
  }
  function changed() { clearDiscount(); refreshStaff(chosen()); keepTime(); update(); }
  // روز و ساعت انتخاب‌شده نگه داشته می‌شود؛ فقط اگر با انتخاب تازه دیگر آزاد نباشد پاک و اعلام می‌شود
  function keepTime() {
    picker.refresh().then(function (lost) {
      if (lost && window.SalonUI) SalonUI.toast("ساعت قبلی با این انتخاب آزاد نیست؛ ساعت دیگری انتخاب کنید.");
      update();
    });
  }

  // ---------- کد تخفیف ----------
  var codeBtn = $("[data-apply-code]", form);
  if (codeBtn) codeBtn.addEventListener("click", function () {
    var ui = window.SalonUI;
    if (!ui || !ui.backend) { if (ui) ui.notConnected(); return; }
    var code = $("[name=discountCode]", form).value.trim();
    var msg = $("[data-code-message]", form);
    var staff = staffInput();
    codeBtn.disabled = true;
    ui.send({
      _act: "applyCode",
      code: code,
      serviceIds: chosen().map(function (i) { return i.value; }).join(","),
      staffId: staff ? staff.value : ""
    }).then(function (data) {
      discount = data.ok ? Number(data.discount) || 0 : 0;
      msg.textContent = data.message || "";
      update();
    }).catch(function () {
      msg.textContent = "ارتباط با سرور برقرار نشد.";
    }).then(function () { codeBtn.disabled = false; });
  });

  $$("input[name=serviceIds]", form).forEach(function (i) { i.addEventListener("change", changed); });
  $$("input[name=staffId]", form).forEach(function (i) {
    i.addEventListener("change", function () {
      // آرایشگر دیگری را از فهرست زد: قفل برداشته شود (بدون پریدن از این قدم)
      if (locked && !locked.contains(i)) clearLock();
      clearDiscount(); keepTime(); update();
    });
  });
  $$("input[name=paymentMethod]", form).forEach(function (i) { i.addEventListener("change", update); });

  // پیش‌انتخاب از آدرس: booking.html?service=2,5&staff=1
  var params = new URLSearchParams(location.search);
  (params.get("service") || "").split(",").filter(Boolean).forEach(function (id) {
    var input = $('input[name=serviceIds][value="' + id + '"]', form);
    if (input) { input.checked = true; var g = input.closest("details"); if (g) g.open = true; }
  });
  refreshStaff(chosen());
  if (params.get("staff")) lockStaff(params.get("staff"));

  // ساعتی که مشتری روی کارت سالن زده (?day=today|tomorrow&time=14:15): بعد از انتخاب خدمت و آرایشگر،
  // در قدم «زمان» همان روز و ساعت خودکار انتخاب می‌شود (اگر هنوز آزاد باشد).
  var wantTime = params.get("time") || "", wantDay = params.get("day") === "tomorrow" ? 1 : 0;
  if (/^\d{1,2}:\d{2}$/.test(wantTime)) {
    var faT = wantTime.replace(/\d/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹"[d]; });
    var note = document.createElement("p");
    note.className = "flash flash--ok booking-want";
    note.setAttribute("role", "status");
    note.textContent = "ساعت " + faT + " " + (wantDay ? "فردا" : "امروز") + " را انتخاب کرده‌اید؛ خدمت و آرایشگر را بزنید، همان ساعت برایتان نگه داشته می‌شود.";
    form.parentNode.insertBefore(note, form);
    onTimeStep = function () {
      onTimeStep = null;
      if (pick.date) return;
      var day = $$("[data-days] .day", form).filter(function (d) { return !d.disabled; })[wantDay];
      if (!day) return;
      day.click();
      // با بک‌اند ساعت‌ها از سرور می‌آیند؛ کمی صبر کن تا رسم شوند
      var tries = 0;
      (function pickSlot() {
        var slot = $('[data-slots] .slot[data-time="' + wantTime + '"]', form);
        if (slot && !slot.disabled) { slot.click(); note.textContent = "ساعت " + faT + " انتخاب شد؛ اگر خواستید عوضش کنید."; return; }
        if (++tries < 10) setTimeout(pickSlot, 150);
        else note.textContent = "ساعت " + faT + " دیگر آزاد نیست؛ یکی از ساعت‌های دیگر را انتخاب کنید.";
      })();
    };
  }

  update();
  show(chosen().length ? 1 : 0, false);
  document.body.classList.add("has-booking-bar");

  // ---------- سالن این رزرو ----------
  // از صفحه سالن، کارت سالن یا آرایشگر: ?salon=N (و شاید ?staff=) → مستقیم خدمت‌ها.
  // از دکمه «رزرو نوبت» سربرگ/منوی پایین (بدون سالن): اول «کدام سالن؟»؛ با ?staff= فقط سالن‌های همان آرایشگر.
  // عوض کردن سالن تنها کاری است که بقیه انتخاب‌ها را پاک می‌کند (خدمت و آرایشگر و ساعت به سالن وابسته‌اند).
  var page = form.closest(".booking-page");
  var salonBar = $("[data-booking-salon]"), pickBox = $("[data-salon-pick]");
  var data = { salons: [], staff: {} };
  try { data = JSON.parse($("#bella-salons").textContent) || data; } catch (e) { /* بدون داده: انتخاب سالن نشان داده نمی‌شود */ }
  var salons = data.salons || [];
  var salonId = null;
  function salonById(id) { return salons.filter(function (s) { return String(s.id) === String(id); })[0]; }
  function setParam(k, v) {
    var p = new URLSearchParams(location.search);
    if (v) p.set(k, v); else p.delete(k);
    history.replaceState(null, "", location.pathname + "?" + p.toString());
  }
  function kmTo(s) {
    var me = window.BellaLoc && BellaLoc.get();
    if (!me || me.lat == null) return null;
    var r = Math.PI / 180, x = Math.sin((s.lat - me.lat) * r / 2), y = Math.sin((s.lng - me.lng) * r / 2);
    return 12742 * Math.asin(Math.sqrt(x * x + Math.cos(me.lat * r) * Math.cos(s.lat * r) * y * y));
  }
  function useSalon(s, reset) {
    if (reset && salonId && String(salonId) !== String(s.id) && (chosen().length || pick.date)) {
      chosen().forEach(function (i) { i.checked = false; });
      clearLock();
      setParam("staff", "");
      $('input[name=staffId][value=""]', form).checked = true;
      picker.reset();
      changed();
      show(0, false);
      if (window.SalonUI) SalonUI.toast("سالن عوض شد؛ خدمت و ساعت را دوباره انتخاب کنید.");
    }
    salonId = s.id;
    setParam("salon", s.id);
    $("[data-salon-name]", salonBar).textContent = s.name + (s.area ? " · " + s.area : "");
    salonBar.hidden = salons.length < 2; // سالن تنها (بک‌اند یک سالن) دکمه تغییر لازم ندارد
    pickBox.hidden = true;
    page.classList.remove("is-picking");
  }
  function showPicker(only) {
    var list = salons.filter(function (s) { return !only || only.indexOf(s.id) > -1; });
    list.forEach(function (s) { s._km = kmTo(s); });
    list.sort(function (a, b) { return (a._km != null && b._km != null) ? a._km - b._km : b.reviews - a.reviews; });
    var box = $("[data-salon-options]", pickBox);
    box.innerHTML = "";
    list.forEach(function (s) {
      var li = document.createElement("li");
      li.innerHTML = '<button type="button" class="salon-pick__opt"><span class="salon-pick__main"><b></b><small></small></span>' +
        '<span class="salon-pick__rate"></span></button>';
      $("b", li).textContent = s.name;
      $("small", li).textContent = [s.area, s._km != null ? number(Math.round(s._km * 10) / 10) + " کیلومتر" : "", s.cats].filter(Boolean).join(" · ");
      $(".salon-pick__rate", li).textContent = "★ " + number(s.rating);
      li.dataset.search = s.name + " " + s.area + " " + s.cats;
      $("button", li).addEventListener("click", function () { useSalon(s, true); window.scrollTo(0, 0); });
      box.appendChild(li);
    });
    var staffName = only && locked ? $("input[name=staffId]", locked).getAttribute("data-name") : "";
    $("[data-salon-pick-note]", pickBox).textContent = staffName
      ? staffName + " در این سالن‌ها کار می‌کند؛ سالنی را که به شما نزدیک‌تر است انتخاب کنید."
      : "سالن را انتخاب کنید؛ بعد خدمت، آرایشگر و ساعت را.";
    pickBox.hidden = false;
    salonBar.hidden = true;
    page.classList.add("is-picking");
  }
  if (salons.length && salonBar && pickBox) {
    var q = $("[data-salon-q]", pickBox);
    q.addEventListener("input", function () {
      var t = q.value.trim(), any = false;
      $$("[data-salon-options] li", pickBox).forEach(function (li) {
        var ok = !t || li.dataset.search.indexOf(t) > -1;
        li.hidden = !ok;
        if (ok) any = true;
      });
      $("[data-salon-empty]", pickBox).hidden = any;
    });
    $("[data-salon-change]", salonBar).addEventListener("click", function () {
      var staff = locked ? (data.staff || {})[$("input[name=staffId]", locked).value] : null;
      showPicker(staff || null);
    });
    var staffSalons = params.get("staff") ? (data.staff || {})[params.get("staff")] : null;
    var start = salonById(params.get("salon")) || (salons.length === 1 ? salons[0] : null) ||
      (staffSalons && staffSalons.length === 1 ? salonById(staffSalons[0]) : null);
    if (start) useSalon(start, false);
    else showPicker(staffSalons || null);
  }
})();
