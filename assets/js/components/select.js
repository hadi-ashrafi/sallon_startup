// منوی کشویی یکسان برای همه دستگاه‌ها، به‌جای <select> پیش‌فرض مرورگر.
// هر <select class="input"> (به‌جز multiple) خودکار تبدیل می‌شود؛ خود select پنهان در فرم می‌ماند و مقدارش ارسال می‌شود.
//   - اگر select گروه (<optgroup>) داشته باشد، هر گروه کشویی (بازشونده) است تا فهرست شلوغ نشود.
//   - اگر بیش از ۱۰ گزینه داشته باشد، کادر جستجو هم می‌گیرد.
//   - صفحه‌کلید: Enter/Space باز می‌کند، بالا و پایین حرکت، Esc می‌بندد.
//   - در موبایل (تا ۶۴۰ پیکسل) فهرست به‌شکل برگه از پایین صفحه بالا می‌آید، با عنوان (برچسب فیلد) و پس‌زمینه تیره.
// برای نگه داشتن select پیش‌فرض روی یک مورد خاص: data-native
(function () {
  "use strict";

  // آیکن از فایل یکسان آیکن‌های سایت (کنار favicon)
  const SPRITE = ((document.querySelector('link[rel="icon"]') || {}).href || "assets/img/favicon.svg").replace(/favicon\.svg.*$/, "icons.svg");
  function svgIcon(name, cls) { return '<svg class="' + (cls ? cls + " " : "") + 'ph" aria-hidden="true"><use href="' + SPRITE + "#" + name + '"/></svg>'; }
  const ICON = svgIcon("chev-down");
  const CHECK = svgIcon("check");
  const CLOSE = svgIcon("x");
  const mobile = window.matchMedia("(max-width: 640px)");
  let openOne = null;
  let uid = 0;
  let backdrop = null;
  function setBackdrop(on) {
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.className = "cselect__backdrop";
      // با click (نه pointerdown) بسته شود تا لمس پس‌زمینه روی کارت زیرش نیفتد
      backdrop.addEventListener("click", () => openOne && openOne.close());
      document.body.appendChild(backdrop);
    }
    backdrop.classList.toggle("is-open", on);
    document.documentElement.classList.toggle("cselect-lock", on);
  }

  function enhance(select) {
    const id = "cs-" + ++uid;
    const wrap = document.createElement("div");
    wrap.className = "cselect";
    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(select);
    select.classList.add("cselect__native");
    select.tabIndex = -1;
    select.setAttribute("aria-hidden", "true");

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "input cselect__btn";
    btn.setAttribute("aria-haspopup", "listbox");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", id);
    btn.innerHTML = '<span class="cselect__value"></span>' + ICON;
    if (select.style.minWidth) btn.style.minWidth = select.style.minWidth;
    wrap.appendChild(btn);

    // برچسب select حالا به دکمه اشاره می‌کند
    const label = select.id && document.querySelector('label[for="' + select.id + '"]');
    if (label) {
      btn.id = select.id + "-btn";
      label.htmlFor = btn.id;
    } else if (select.getAttribute("aria-label")) {
      btn.setAttribute("aria-label", select.getAttribute("aria-label"));
    }

    // ---------- پنل ----------
    const panel = document.createElement("div");
    panel.className = "cselect__panel";
    panel.id = id;
    panel.hidden = true;
    // عنوان برگه موبایل: متن برچسب فیلد
    const title = (label && label.textContent.trim()) || select.getAttribute("aria-label") || "انتخاب کنید";
    panel.innerHTML = '<div class="cselect__head"><b></b><button type="button" class="cselect__close" aria-label="بستن">' + CLOSE + "</button></div>";
    panel.querySelector(".cselect__head b").textContent = title;
    panel.querySelector(".cselect__close").addEventListener("click", () => { close(); btn.focus(); });
    const many = select.options.length > 10;
    if (many) panel.insertAdjacentHTML("beforeend", '<input type="search" class="cselect__search" placeholder="جستجو..." aria-label="جستجو در گزینه‌ها">');
    const list = document.createElement("div");
    list.className = "cselect__list";
    list.setAttribute("role", "listbox");
    panel.appendChild(list);
    document.body.appendChild(panel);

    const optionEl = (opt) => {
      const o = document.createElement("div");
      o.className = "cselect__opt";
      o.setAttribute("role", "option");
      o.tabIndex = -1;
      o.dataset.value = opt.value;
      o.innerHTML = "<span></span>" + CHECK;
      o.firstChild.textContent = opt.textContent.trim();
      if (opt.disabled) o.setAttribute("aria-disabled", "true");
      o.addEventListener("click", () => { if (!opt.disabled) choose(opt); });
      return o;
    };

    Array.from(select.children).forEach((child) => {
      if (child.tagName === "OPTGROUP") {
        const group = document.createElement("div");
        group.className = "cselect__group";
        const head = document.createElement("button");
        head.type = "button";
        head.className = "cselect__group-head";
        head.setAttribute("aria-expanded", "false");
        head.innerHTML = "<span></span><small></small>" + ICON;
        head.firstChild.textContent = child.label;
        head.children[1].textContent = child.children.length.toLocaleString("fa-IR");
        const body = document.createElement("div");
        body.className = "cselect__group-body";
        body.setAttribute("role", "group");
        body.setAttribute("aria-label", child.label);
        Array.from(child.children).forEach((opt) => body.appendChild(optionEl(opt)));
        head.addEventListener("click", () => setGroup(group, head.getAttribute("aria-expanded") !== "true"));
        group.append(head, body);
        list.appendChild(group);
      } else {
        list.appendChild(optionEl(child));
      }
    });

    const options = () => Array.from(list.querySelectorAll(".cselect__opt")).filter((o) => o.offsetParent !== null);

    function setGroup(group, open) {
      group.classList.toggle("is-open", open);
      group.querySelector(".cselect__group-head").setAttribute("aria-expanded", String(open));
    }

    function sync() {
      const opt = select.options[select.selectedIndex];
      btn.querySelector(".cselect__value").textContent = opt ? opt.textContent.trim() : "";
      list.querySelectorAll(".cselect__opt").forEach((o) => o.setAttribute("aria-selected", String(opt && o.dataset.value === opt.value)));
    }

    function choose(opt) {
      select.value = opt.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      sync();
      close();
      btn.focus();
    }

    function place() {
      panel.classList.toggle("is-sheet", mobile.matches);
      if (mobile.matches) { // برگه پایین صفحه؛ جا را CSS تعیین می‌کند
        panel.style.cssText = "";
        return;
      }
      const r = btn.getBoundingClientRect();
      const below = innerHeight - r.bottom;
      const up = below < 260 && r.top > below;
      panel.style.width = Math.max(r.width, 220) + "px";
      panel.style.right = Math.max(8, innerWidth - r.right) + "px";
      panel.style.top = up ? "" : r.bottom + 6 + "px";
      panel.style.bottom = up ? innerHeight - r.top + 6 + "px" : "";
      panel.style.maxHeight = Math.min(360, (up ? r.top : below) - 16) + "px";
    }

    function open() {
      if (openOne && openOne !== api) openOne.close();
      openOne = api;
      panel.hidden = false;
      place();
      requestAnimationFrame(() => panel.classList.add("is-open"));
      if (mobile.matches) setBackdrop(true);
      btn.setAttribute("aria-expanded", "true");
      // گروهِ گزینه انتخاب‌شده باز باشد
      const sel = list.querySelector('[aria-selected="true"]');
      const group = sel && sel.closest(".cselect__group");
      if (group) setGroup(group, true);
      const search = panel.querySelector(".cselect__search");
      (search || sel || options()[0] || btn).focus({ preventScroll: true });
      if (sel) sel.scrollIntoView({ block: "nearest" });
    }

    function close() {
      panel.classList.remove("is-open");
      panel.hidden = true;
      setBackdrop(false);
      btn.setAttribute("aria-expanded", "false");
      if (openOne === api) openOne = null;
    }

    btn.addEventListener("click", () => (panel.hidden ? open() : close()));
    btn.addEventListener("keydown", (e) => {
      if (["ArrowDown", "ArrowUp"].includes(e.key)) { e.preventDefault(); open(); }
    });

    panel.addEventListener("keydown", (e) => {
      const opts = options();
      const i = opts.indexOf(document.activeElement);
      if (e.key === "Escape") { e.preventDefault(); close(); btn.focus(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); (opts[i + 1] || opts[0]).focus(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); (opts[i - 1] || opts[opts.length - 1]).focus(); }
      else if ((e.key === "Enter" || e.key === " ") && document.activeElement.classList.contains("cselect__opt")) {
        e.preventDefault();
        document.activeElement.click();
      } else if (e.key === "Tab") close();
    });

    // جستجو: گروه‌های دارای نتیجه باز می‌شوند
    const search = panel.querySelector(".cselect__search");
    if (search) {
      search.addEventListener("input", () => {
        const q = search.value.trim();
        list.querySelectorAll(".cselect__opt").forEach((o) => { o.hidden = Boolean(q) && !o.textContent.includes(q); });
        list.querySelectorAll(".cselect__group").forEach((g) => {
          const hits = g.querySelectorAll(".cselect__opt:not([hidden])").length;
          g.hidden = !hits;
          setGroup(g, Boolean(q) && hits > 0);
        });
      });
    }

    select.addEventListener("change", sync);
    const api = { close, panel, wrap, place };
    sync();
    return api;
  }

  document.querySelectorAll("select.input:not([multiple]):not([data-native])").forEach(enhance);
  window.SalonSelect = { enhance }; // برای selectهایی که بعد از بارگذاری ساخته می‌شوند

  document.addEventListener("pointerdown", (e) => {
    if (openOne && e.target !== backdrop && !openOne.panel.contains(e.target) && !openOne.wrap.contains(e.target)) openOne.close();
  });
  addEventListener("resize", () => openOne && openOne.place());
  addEventListener("scroll", (e) => { if (openOne && !openOne.panel.contains(e.target)) openOne.place(); }, true);

})();
