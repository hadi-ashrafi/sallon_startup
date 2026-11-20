// سرویس‌ورکر وب‌اپ: فایل‌های سایت را ذخیره می‌کند تا سریع و حتی بدون اینترنت باز شود.
// هر بار فایلی تغییر کرد، VERSION را بالا ببرید تا گوشی‌ها نسخه تازه را بگیرند
// (فایل‌ها با cache: "reload" مستقیم از سرور گرفته می‌شوند، نه از حافظه مرورگر).
// صفحه‌ها «اول شبکه» (تا همیشه تازه باشند) و بقیه فایل‌ها «اول حافظه» (برای سرعت) خوانده می‌شوند.
const VERSION = "bella-v28";
// صفحه‌های شخصی (پنل‌ها و حساب کاربری) هیچ‌وقت در حافظه گوشی ذخیره نمی‌شوند:
// با بک‌اند، محتوایشان مال همان کاربر است و بعد از خروج نباید روی دستگاه بماند.
const PRIVATE = /\/(admin|stylist|customer|platform)\/|\/account\/(profile|notifications)\.html/;
const PRECACHE = [
  "./",
  "404.html",
  "about.html",
  "account/forgot-password.html",
  "account/login.html",
  "account/register.html",
  "account/reset-password.html",
  "assets/css/base/base.css",
  "assets/css/base/motion.css",
  "assets/css/base/tokens.css",
  "assets/css/components/buttons.css",
  "assets/css/components/cards.css",
  "assets/css/components/dialog.css",
  "assets/css/components/forms.css",
  "assets/css/components/tables.css",
  "assets/css/layout/footer.css",
  "assets/css/layout/header.css",
  "assets/css/layout/panel.css",
  "assets/css/pages/auth.css",
  "assets/css/pages/booking.css",
  "assets/css/pages/catalog.css",
  "assets/css/pages/dashboard.css",
  "assets/fonts/vazirmatn-arabic.woff2",
  "assets/fonts/vazirmatn-latin.woff2",
  "assets/img/app-icon.svg",
  "assets/img/salon-default.svg",
  "assets/img/avatar-dark.svg",
  "assets/img/avatar.svg",
  "assets/img/favicon.svg",
  "assets/img/icons.svg",
  "assets/img/icon-180.png",
  "assets/img/icon-192.png",
  "assets/img/icon-512.png",
  "assets/img/logo-dark.svg",
  "assets/img/logo.svg",
  "assets/img/salon.svg",
  "assets/js/common/forms.js",
  "assets/js/common/nav.js",
  "assets/js/common/reveal.js",
  "assets/js/common/theme.js",
  "assets/js/common/ui.js",
  "assets/js/components/panel.js",
  "assets/js/components/datepicker.js",
  "assets/js/components/select.js",
  "assets/js/components/slot-picker.js",
  "assets/js/pages/booking.js",
  "assets/js/pages/list-filter.js",
  "assets/js/pages/reschedule.js",
  "assets/js/theme-init.js",
  "booking-done.html",
  "booking.html",
  "index.html",
  "manifest.webmanifest",
  "pay.html",
  "payment-result.html",
  "service.html",
  "services.html",
  "stylist.html",
  "stylists.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;

  // صفحه‌ها: اول شبکه، اگر اینترنت نبود از حافظه (و در نهایت صفحه اصلی)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // فقط صفحه عمومی و سالم ذخیره شود (نه redirect به صفحه ورود، نه صفحه شخصی)
          if (res.ok && !res.redirected && !PRIVATE.test(new URL(req.url).pathname)) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match("index.html")))
    );
    return;
  }

  // CSS، JS، تصویر و فونت: اول حافظه، بعد شبکه
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
