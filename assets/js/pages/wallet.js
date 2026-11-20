// کیف پول و فرم‌های مالی:
//   [data-money]              مبلغ با رقم فارسی و جداکننده هزارگان؛ [data-money-words] زیرش «۱٫۲ میلیون تومان» را نشان می‌دهد.
//   .amount-chips [data-amount] مبلغ آماده را در فیلد amount همان فرم می‌گذارد.
//   <form data-wallet-form data-max> حداقل (data-min روی فیلد) و حداکثر (موجودی) را پیش از ارسال بررسی می‌کند.
//   [data-fee-settings]       پیش‌نمایش تقسیم مبلغ با درصدهای واردشده (پنل مدیریت سامانه).
// بک‌اند: مبلغ را با حذف «٬» و تبدیل رقم فارسی بخوانید؛ سقف و حداقل باید سمت سرور هم بررسی شود.
(function () {
  "use strict";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var fa = function (n) { return String(n).replace(/\d/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹"[d]; }); };
  var raw = function (s) { return Number(String(s || "").replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 0x06f0); }).replace(/\D/g, "")) || 0; };
  var money = function (n) { return fa(Math.round(n).toLocaleString("en-US").replace(/,/g, "٬")); };
  function words(n) {
    if (!n) return "";
    if (n >= 1e9) return fa((n / 1e9).toFixed(2).replace(/\.?0+$/, "")).replace(".", "٫") + " میلیارد تومان";
    if (n >= 1e6) return fa((n / 1e6).toFixed(2).replace(/\.?0+$/, "")).replace(".", "٫") + " میلیون تومان";
    if (n >= 1e3) return fa(Math.round(n / 1e3)) + " هزار تومان";
    return fa(n) + " تومان";
  }

  function setMoney(input, n) {
    input.value = n ? money(n) : "";
    var hint = input.closest(".field") && $("[data-money-words]", input.closest(".field"));
    if (hint) hint.textContent = words(n);
  }
  // wizard.js هم همین فرمت را دارد؛ اینجا فقط فیلدهایی که آن‌جا نیستند
  if (!document.querySelector("[data-wizard]")) {
    $$("[data-money]").forEach(function (input) {
      input.addEventListener("input", function () { setMoney(input, raw(input.value)); });
    });
  }

  document.addEventListener("click", function (e) {
    var chip = e.target.closest("[data-amount]");
    if (!chip) return;
    var form = chip.closest("form"), input = $("[name=amount]", form);
    $$("[data-amount]", form).forEach(function (b) { b.classList.toggle("is-on", b === chip); });
    setMoney(input, +chip.dataset.amount);
    input.focus();
  });

  document.addEventListener("submit", function (e) {
    var form = e.target.closest("[data-wallet-form]");
    if (!form) return;
    var input = $("[name=amount]", form), n = raw(input.value), min = +input.dataset.min || 0, max = +form.dataset.max || Infinity;
    var msg = !n ? "مبلغ را وارد کنید." : n < min ? "حداقل مبلغ " + money(min) + " تومان است." : n > max ? "بیشتر از موجودی قابل برداشت است." : "";
    if (msg) { e.preventDefault(); e.stopImmediatePropagation(); SalonUI.formError(form, msg); input.focus(); }
  }, true);

  // پیش‌نمایش کارمزد
  var fees = $("[data-fee-settings]");
  if (fees) {
    var EX = 1000000;
    var update = function () {
      var fee = +$("[name=feePercent]", fees).value || 0, dep = +$("[name=depositPercent]", fees).value || 0, r = +$("[name=roundTo]", fees).value || 1;
      var round = function (x) { return Math.round(x / r) * r; };
      var feeAmt = round(EX * fee / 100), depAmt = round(EX * dep / 100), half = round(depAmt / 2);
      $("[data-prev-online]", fees).textContent = money(feeAmt) + " / " + money(EX - feeAmt) + " تومان";
      $("[data-prev-deposit]", fees).textContent = money(depAmt) + " تومان";
      $("[data-prev-cash]", fees).textContent = money(half) + " / " + money(depAmt - half) + " تومان";
    };
    fees.addEventListener("input", update);
    update();
  }
})();
