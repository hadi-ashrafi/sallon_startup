// وب‌اپ: ثبت سرویس‌ورکر (باز شدن سریع و آفلاین) و دکمه «نصب اپ» وقتی مرورگر اجازه نصب بدهد.
// در آیفون مرورگر دکمه نصب ندارد؛ راهنمای «Share ← Add to Home Screen» یک بار نشان داده می‌شود.
(function () {
  "use strict";

  // آدرس سرویس‌ورکر نسبت به ریشه سایت (برای صفحه‌های داخل پوشه‌ها ../)
  var root = (document.querySelector('link[rel="manifest"]') || {}).href;
  // روی سیستم توسعه (localhost) سرویس‌ورکر ثبت نمی‌شود و قبلی‌ها پاک می‌شوند؛
  // وگرنه CSS و JS از حافظه می‌آیند و تغییرها تا بالا بردن VERSION دیده نمی‌شوند.
  var dev = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  if (dev && "serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (regs) { regs.forEach(function (r) { r.unregister(); }); });
  } else if ("serviceWorker" in navigator && root) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register(new URL("sw.js", root).href).catch(function () { /* بدون سرویس‌ورکر هم سایت کار می‌کند */ });
    });
  }

  var standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if (standalone) return;

  function seen(key) { try { return localStorage.getItem(key); } catch (e) { return "1"; } }
  function remember(key) { try { localStorage.setItem(key, "1"); } catch (e) { /* حافظه مرورگر بسته است */ } }

  function banner(text, actionLabel, onAction) {
    var box = document.createElement("div");
    box.className = "install-banner";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "نصب وب‌اپ");
    box.innerHTML = '<img src="' + new URL("assets/img/icon-192.png", root).href + '" alt="" width="40" height="40"><p></p>' +
      (actionLabel ? '<button type="button" class="btn btn-primary btn-sm" data-install></button>' : "") +
      '<button type="button" class="icon-btn" data-dismiss aria-label="بستن">✕</button>';
    box.querySelector("p").textContent = text;
    if (actionLabel) {
      var btn = box.querySelector("[data-install]");
      btn.textContent = actionLabel;
      btn.addEventListener("click", function () { onAction(); box.remove(); });
    }
    box.querySelector("[data-dismiss]").addEventListener("click", function () { remember("aida-install-dismissed"); box.remove(); });
    document.body.appendChild(box);
  }

  // اندروید و دسکتاپ (کروم، اج، سامسونگ)
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    if (seen("aida-install-dismissed")) return;
    banner("اپ سالن آیدا را روی گوشی نصب کنید؛ رزرو سریع‌تر، بدون باز کردن مرورگر.", "نصب اپ", function () { e.prompt(); });
  });

  // آیفون و آیپد (سافاری)
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (ios && !seen("aida-install-dismissed")) {
    window.addEventListener("load", function () {
      setTimeout(function () { banner("برای نصب اپ: دکمه Share پایین سافاری ← «Add to Home Screen».", null, null); }, 2500);
    });
  }
})();
