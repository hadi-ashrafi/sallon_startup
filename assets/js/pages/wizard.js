// فرم چندمرحله‌ای ثبت‌نام (آرایشگر و سالن).
//   <form data-wizard> با <fieldset data-wstep="0..n">، نوار مراحل [data-wdots] و دکمه‌های [data-wnext] [data-wback] [data-wsubmit].
//   هر قدم پیش از رفتن به قدم بعد اعتبارسنجی می‌شود: فیلدهای required، گروه رادیو، فایل‌ها و .tag-picker[data-min-check].
//   data-show-if="name=v1,v2": فقط وقتی آن گزینه انتخاب شده نمایش داده می‌شود (و فقط آن موقع اعتبارسنجی).
//   data-toggle-target="id": چک‌باکسی که بخش دیگری را باز و بسته می‌کند.
//   قدم آخر: [data-wreview-list] از فیلدهای دارای data-label خلاصه می‌سازد.
//   ارسال نهایی با forms.js (تا action خالی است، پیام «وصل نشده» می‌آید).
(function () {
  "use strict";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var fa = function (n) { return String(n).replace(/\d/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹"[d]; }); };
  var toLatin = function (s) { return String(s || "").replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 0x06f0); }); };

  // ---------- مبلغ با جداکننده هزارگان ----------
  $$("[data-money]").forEach(function (input) {
    input.addEventListener("input", function () {
      var digits = toLatin(input.value).replace(/\D/g, "").replace(/^0+/, "");
      input.value = digits ? fa(Number(digits).toLocaleString("en-US").replace(/,/g, "٬")) : "";
    });
  });

  // ---------- فایل‌ها: نام فایل انتخاب‌شده ----------
  $$(".upload-box input[type=file]").forEach(function (input) {
    input.addEventListener("change", function () {
      var box = input.closest(".upload-box");
      var names = Array.prototype.map.call(input.files, function (f) { return f.name; });
      $("[data-file-name]", box).textContent = names.length > 1 ? fa(names.length) + " فایل انتخاب شد" : (names[0] || "");
      box.classList.toggle("has-file", names.length > 0);
      box.classList.remove("is-invalid");
    });
  });

  // ---------- نمایش شرطی ----------
  function syncConditional(form) {
    $$("[data-show-if]", form).forEach(function (el) {
      var rule = el.dataset.showIf.split("="), checked = $('[name="' + rule[0] + '"]:checked', form);
      el.hidden = !(checked && rule[1].split(",").indexOf(checked.value) > -1);
    });
    $$("[data-toggle-target]", form).forEach(function (cb) {
      var target = document.getElementById(cb.dataset.toggleTarget);
      if (target) target.hidden = !cb.checked;
    });
  }

  function isShown(el) {
    for (var n = el; n && n.tagName !== "FORM"; n = n.parentElement) if (n.hidden) return false;
    return true;
  }

  // ---------- اعتبارسنجی یک قدم ----------
  function clearErrors(step) {
    $$(".field-error", step).forEach(function (e) { e.remove(); });
    $$(".is-invalid", step).forEach(function (e) { e.classList.remove("is-invalid"); });
  }
  function errorAfter(el, msg) {
    var holder = el.closest(".field") || el.closest(".upload-box") || el.parentElement;
    if (holder.querySelector(".field-error")) return;
    var p = document.createElement("span");
    p.className = "field-error";
    p.textContent = msg;
    (holder.classList.contains("upload-box") ? holder.parentElement : holder).appendChild(p);
  }
  function validate(step) {
    clearErrors(step);
    var first = null;
    function bad(el, msg, mark) {
      (mark || el).classList.add("is-invalid");
      errorAfter(mark || el, msg);
      if (!first) first = el;
    }
    var radios = {};
    $$("input, select, textarea", step).forEach(function (el) {
      if (!isShown(el) || el.disabled) return;
      if (el.type === "radio") { if (el.required) radios[el.name] = true; return; }
      if (el.type === "file") {
        if (el.required && !el.files.length) bad(el, "این مدرک لازم است.", el.closest(".upload-box"));
        return;
      }
      if (el.type === "checkbox") { if (el.required && !el.checked) bad(el, "برای ادامه باید این بند را بپذیرید.", el.closest(".check") || el); return; }
      if (!el.checkValidity()) {
        var msg = el.validity.valueMissing ? "این بخش را پر کنید." : el.validity.patternMismatch ? "قالب درست نیست." :
          el.validity.tooShort ? "کوتاه است؛ دست‌کم " + fa(el.minLength) + " حرف." : "مقدار درست نیست.";
        bad(el, msg);
      }
    });
    Object.keys(radios).forEach(function (name) {
      if (!$('[name="' + name + '"]:checked', step)) {
        var group = $('[name="' + name + '"]', step).closest(".pay-methods, .seg") || $('[name="' + name + '"]', step);
        bad($('[name="' + name + '"]', step), "یکی از گزینه‌ها را انتخاب کنید.", group);
      }
    });
    $$("[data-min-check]", step).forEach(function (box) {
      if (!isShown(box)) return;
      if ($$("input:checked", box).length < +box.dataset.minCheck) bad($("input", box), "دست‌کم یکی را انتخاب کنید.", box);
    });
    if (first) { first.focus({ preventScroll: true }); (first.closest(".field, .upload-box, .tag-picker, .pay-methods") || first).scrollIntoView({ behavior: "smooth", block: "center" }); }
    return !first;
  }

  // ---------- خلاصه پایانی ----------
  function review(form) {
    var list = $("[data-wreview-list]", form);
    if (!list) return;
    var seen = {}, html = "";
    function row(label, value) { if (value) html += "<dt>" + label + "</dt><dd>" + value.replace(/</g, "&lt;") + "</dd>"; }
    $$("[data-label]", form).forEach(function (el) {
      if (!isShown(el) || el.closest("[data-wstep]") === $("[data-wstep]:last-of-type", form)) return;
      var label = el.dataset.label;
      if (el.classList.contains("tag-picker")) {
        row(label, $$("input:checked", el).map(function (i) { return i.nextElementSibling.textContent; }).join("، "));
      } else if (el.type === "radio") {
        if (seen[el.name]) return;
        seen[el.name] = true;
        var c = $('[name="' + el.name + '"]:checked', form);
        row(label, c ? (c.dataset.text || c.value) : "");
      } else if (el.type === "file") {
        row(label, el.files.length ? "✓ بارگذاری شد" : "");
      } else if (el.tagName === "SELECT") {
        row(label, el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : "");
      } else if (el.type !== "checkbox") {
        row(label, el.name === "sheba" && el.value ? "IR" + el.value : el.value);
      }
    });
    list.innerHTML = html || "<dt>-</dt><dd>-</dd>";
  }

  // ---------- مراحل ----------
  $$("[data-wizard]").forEach(function (form) {
    var steps = $$("[data-wstep]", form), dots = $$("[data-wdot]", form), at = 0;
    var next = $("[data-wnext]", form), back = $("[data-wback]", form), submit = $("[data-wsubmit]", form), count = $("[data-wcount]", form);

    function go(i, focus) {
      at = Math.max(0, Math.min(steps.length - 1, i));
      steps.forEach(function (s, k) { s.hidden = k !== at; });
      dots.forEach(function (d, k) {
        d.classList.toggle("is-done", k < at);
        if (k === at) d.setAttribute("aria-current", "step"); else d.removeAttribute("aria-current");
      });
      back.hidden = at === 0;
      next.hidden = at === steps.length - 1;
      submit.hidden = at !== steps.length - 1;
      count.textContent = "مرحله " + fa(at + 1) + " از " + fa(steps.length);
      if (at === steps.length - 1) review(form);
      if (focus) {
        form.scrollIntoView({ behavior: "smooth", block: "start" });
        var f = $("input:not([type=hidden]), select, textarea", steps[at]);
        if (f) setTimeout(function () { f.focus({ preventScroll: true }); }, 250);
      }
    }
    next.addEventListener("click", function () { if (validate(steps[at])) go(at + 1, true); });
    back.addEventListener("click", function () { go(at - 1, true); });
    // برگشت به قدم‌های قبلی با زدن روی نوار مراحل
    dots.forEach(function (d, k) { d.addEventListener("click", function () { if (k < at) go(k, true); }); });
    // Enter در فیلدها: قدم بعد، نه ارسال
    form.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && e.target.tagName === "INPUT" && at < steps.length - 1) { e.preventDefault(); next.click(); }
    });
    form.addEventListener("change", function () { syncConditional(form); });
    form.addEventListener("input", function (e) {
      var f = e.target.closest(".is-invalid, .field");
      if (f) { f.classList.remove("is-invalid"); var er = f.querySelector(".field-error"); if (er) er.remove(); }
      if (e.target.classList.contains("is-invalid")) e.target.classList.remove("is-invalid");
    });
    // ارسال: همه قدم‌ها دوباره بررسی می‌شوند؛ اولین قدمِ ناقص باز می‌شود (قبل از forms.js)
    form.addEventListener("submit", function (e) {
      for (var k = 0; k < steps.length; k++) {
        steps[k].hidden = false;
        var ok = validate(steps[k]);
        steps[k].hidden = k !== at;
        if (!ok) { e.preventDefault(); e.stopImmediatePropagation(); go(k, false); validate(steps[k]); return; }
      }
    }, true);
    syncConditional(form);
    go(0, false);
  });
})();
