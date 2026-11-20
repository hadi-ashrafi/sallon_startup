// فیلتر همان‌لحظه‌ی فهرست آرایشگران و فهرست خدمات (بدون بارگذاری دوباره صفحه).
//
// در HTML:
//   <nav class="cat-chips" data-chip-param="specialty">  لینک‌های ?specialty=N (یا ?category=N) دکمه فیلتر می‌شوند
//   <form data-list-filter="stylists|services">         فیلد q (نام) و در آرایشگران select[name=service] و select[name=kind] (مستقل / کارمند سالن)
//   [data-list]                                          ظرف فهرست
//   [data-list-status] / [data-list-count] / [data-list-reset] / [data-list-empty]
//   آرایشگر: <article class="stylist-card" data-name data-kind="independent|staff" data-specialties="1,2" data-services="1,2,3">
//   خدمت:   <section class="svc-group" id="cat-N"> با <a class="tile"><span class="tile__name">
//
// فیلترها در نشانی صفحه (?q=&service=&kind=&specialty=&category=) هم نوشته می‌شوند تا لینک و دکمه برگشت درست کار کند؛
// بک‌اند هم می‌تواند همین پارامترها را بخواند. بدون جاوااسکریپت، فرم و لینک‌ها مثل قبل به سرور می‌روند.
(function () {
  "use strict";

  const form = document.querySelector("[data-list-filter]");
  const list = document.querySelector("[data-list]");
  if (!form || !list) return;

  const kind = form.dataset.listFilter; // stylists | services
  const chips = document.querySelector("[data-chip-param]");
  const chipParam = chips ? chips.dataset.chipParam : "";
  const status = document.querySelector("[data-list-status]");
  const count = document.querySelector("[data-list-count]");
  const empty = document.querySelector("[data-list-empty]");
  const q = form.elements.q;
  const service = form.elements.service || null;
  const coop = form.elements.kind || null; // نوع همکاری آرایشگر
  const fa = (n) => n.toLocaleString("fa-IR");

  // ی و ک عربی، نیم‌فاصله و فاصله‌های اضافه یکسان شوند تا «آرایش دائم» و «آرایش‌دائم» هر دو پیدا شوند.
  const norm = (s) => (s || "").replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[‌\s]+/g, " ").trim().toLowerCase();
  const ids = (s) => (s || "").split(",").filter(Boolean);
  const chipValue = (a) => new URL(a.href, location.href).searchParams.get(chipParam) || "";

  // فرم زنده است: دکمه «فیلتر/جستجو» لازم نیست
  form.classList.add("is-live");

  // ---------- حالت از نشانی صفحه ----------
  const params = new URLSearchParams(location.search);
  const state = {
    q: params.get("q") || "",
    service: params.get("service") || "",
    coop: params.get("kind") || "",
    chip: chipParam ? params.get(chipParam) || "" : "",
  };
  if (q) q.value = state.q;
  if (coop && state.coop) {
    coop.value = state.coop;
    coop.dispatchEvent(new Event("change", { bubbles: true }));
  }
  if (service && state.service) {
    service.value = state.service;
    service.dispatchEvent(new Event("change", { bubbles: true })); // منوی کشویی سفارشی هم به‌روز شود
  }

  function syncURL() {
    const p = new URLSearchParams(location.search);
    const set = (k, v) => (v ? p.set(k, v) : p.delete(k));
    set("q", state.q);
    if (service) set("service", state.service);
    if (coop) set("kind", state.coop);
    if (chipParam) set(chipParam, state.chip);
    const qs = p.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
  }

  function markChips() {
    if (!chips) return;
    chips.querySelectorAll("a").forEach((a) => {
      if (chipValue(a) === state.chip) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  // ---------- اعمال فیلتر ----------
  function apply() {
    const text = norm(state.q);
    let shown = 0;

    if (kind === "stylists") {
      list.querySelectorAll(".stylist-card").forEach((card) => {
        const ok =
          (!text || norm(card.dataset.name).includes(text)) &&
          (!state.service || ids(card.dataset.services).includes(state.service)) &&
          (!state.coop || card.dataset.kind === state.coop) &&
          (!state.chip || ids(card.dataset.specialties).includes(state.chip));
        card.hidden = !ok;
        if (ok) shown++;
      });
    } else {
      list.querySelectorAll(".svc-group").forEach((group) => {
        const inCategory = !state.chip || group.id === "cat-" + state.chip;
        // جستجوی نام دسته (مثلاً «ناخن») همه خدمات آن دسته را نشان می‌دهد
        const title = group.querySelector("h2");
        const groupMatch = Boolean(text) && norm(title ? title.textContent : "").includes(text);
        let inGroup = 0;
        group.querySelectorAll(".tile").forEach((tile) => {
          const name = tile.querySelector(".tile__name");
          const ok = inCategory && (!text || groupMatch || norm(name ? name.textContent : tile.textContent).includes(text));
          tile.hidden = !ok;
          if (ok) inGroup++;
        });
        group.hidden = inGroup === 0;
        shown += inGroup;
      });
    }

    const filtered = Boolean(state.q || state.service || state.coop || state.chip);
    if (status) status.hidden = !filtered;
    if (count) count.textContent = shown ? fa(shown) + (kind === "stylists" ? " آرایشگر" : " خدمت") + " پیدا شد" : "نتیجه‌ای پیدا نشد";
    if (empty) empty.hidden = shown > 0;
    markChips();
    syncURL();
  }

  // ---------- رویدادها ----------
  if (q) q.addEventListener("input", () => { state.q = q.value.trim(); apply(); });
  if (service) service.addEventListener("change", () => { state.service = service.value; apply(); });
  if (coop) coop.addEventListener("change", () => { state.coop = coop.value; apply(); });
  form.addEventListener("submit", (e) => { e.preventDefault(); apply(); });

  if (chips) {
    chips.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      e.preventDefault();
      state.chip = chipValue(a);
      apply();
      // دکمه انتخاب‌شده در نوار افقی دیده شود
      a.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  }

  document.querySelectorAll("[data-list-reset]").forEach((btn) =>
    btn.addEventListener("click", () => {
      state.q = state.service = state.coop = state.chip = "";
      if (coop) {
        coop.value = "";
        coop.dispatchEvent(new Event("change", { bubbles: true }));
      }
      if (q) q.value = "";
      if (service) {
        service.value = "";
        service.dispatchEvent(new Event("change", { bubbles: true }));
      }
      apply();
    })
  );

  apply();
  // اگر صفحه با فیلترِ دسته باز شد، همان دکمه در نوار افقی دیده شود
  const current = chips && state.chip && chips.querySelector("a[aria-current]");
  if (current) current.scrollIntoView({ block: "nearest", inline: "center" });
})();
