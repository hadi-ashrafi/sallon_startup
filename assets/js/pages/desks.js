// اجاره میز: فیلتر کارت‌ها و محاسبه مبلغ در دیالوگ درخواست اجاره.
//   کارت‌ها <article data-desk data-kind data-area data-day> · فرم فیلتر [data-desk-filters] (q, kind, sort)
//   دیالوگ #rent-dialog: panel.js فیلدهای مخفی dayPrice/monthPrice را با data-fill پر می‌کند؛ اینجا جمع حساب می‌شود.
// بک‌اند: مبلغ نهایی، موجودی کیف پول و آزاد بودن میز را سمت سرور بررسی کنید.
(function () {
  "use strict";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var fa = function (n) { return String(n).replace(/\d/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹"[d]; }); };
  var money = function (n) { return fa(Math.round(n).toLocaleString("en-US").replace(/,/g, "٬")) + " تومان"; };
  var norm = function (s) { return (s || "").replace(/[‌\s]+/g, " ").trim(); };

  var form = $("[data-desk-filters]"), list = $("[data-desk-list]");
  if (form && list) {
    var apply = function () {
      var q = norm($("[name=q]", form).value), kind = $("[name=kind]", form).value, sort = $("[name=sort]", form).value, shown = 0;
      var cards = $$("[data-desk]", list);
      cards.forEach(function (c) {
        var ok = (!q || norm(c.textContent).indexOf(q) > -1) && (!kind || c.dataset.kind === kind);
        c.hidden = !ok;
        if (ok) shown++;
      });
      if (sort === "cheap") cards.sort(function (a, b) { return a.dataset.day - b.dataset.day; }).forEach(function (c) { list.insertBefore(c, $("[data-empty]", list)); });
      $("[data-empty]", list).hidden = shown > 0;
    };
    form.addEventListener("input", apply);
    form.addEventListener("change", apply);
    form.addEventListener("submit", function (e) { e.preventDefault(); apply(); });
  }

  var rent = $("[data-rent-form]");
  if (rent) {
    var days = $("[name=days]", rent);
    var update = function () {
      var period = $("[name=period]:checked", rent).value;
      var day = +$("[name=dayPrice]", rent).value || 0, month = +$("[name=monthPrice]", rent).value || 0;
      var monthRadio = $("[name=period][value=month]", rent);
      monthRadio.disabled = !month;
      if (!month && period === "month") { $("[name=period][value=day]", rent).checked = true; period = "day"; }
      days.closest(".field").hidden = period === "month";
      var n = Math.max(1, Math.min(30, +String(days.value).replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 0x06f0; }) || 1));
      var total = period === "month" ? month : day * n;
      $$("[data-rent-total]", rent).forEach(function (el) { el.textContent = money(total); });
    };
    rent.addEventListener("input", update);
    rent.addEventListener("change", update);
    // بعد از این‌که panel.js دیالوگ را باز و فیلدها را پر کرد
    document.addEventListener("click", function (e) { if (e.target.closest('[data-open="rent-dialog"]')) setTimeout(update, 0); });
  }
})();
