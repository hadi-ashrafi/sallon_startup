// انتخاب روز و ساعت؛ مشترک بین رزرو نوبت و تغییر زمان نوبت.
// نشانه‌گذاری لازم داخل فرم:
//   [data-days]  .day  (data-date="2026-11-14")     دکمه‌های روز
//   [data-slots] .slot (data-time="10:30")          دکمه‌های ساعت
//   #step-time و [data-slots-state]                 مرحله ساعت و پیام راهنمای آن
//   [data-picked-date] و [data-picked-time]         فیلدهای مخفی که با فرم ارسال می‌شوند
//
// بدون بک‌اند روزها و ساعت‌ها نمونه ثابت‌اند. اگر فرم data-slots-url داشته باشد (بک‌اند می‌گذارد)، با انتخاب روز
// ساعت‌های آزاد همان روز از سرور گرفته می‌شود: GET {url}?date=…&serviceIds=…&staffId=…&id=…
// پاسخ: {"slots":[{"time":"10:00","label":"۱۰:۰۰"}], "message":"…"}
(function () {
  "use strict";

  function mount(root, onChange) {
    const days = Array.from(root.querySelectorAll("[data-days] .day"));
    let slots = Array.from(root.querySelectorAll("[data-slots] .slot"));
    const slotsBox = root.querySelector("[data-slots]");
    const slotsUrl = root.dataset.slotsUrl;
    let request = 0;
    const stepTime = root.querySelector("#step-time");
    const slotsState = root.querySelector("[data-slots-state]");
    const dateInput = root.querySelector("[data-picked-date]");
    const timeInput = root.querySelector("[data-picked-time]");
    const pick = { date: "", time: "", dayLabel: "", timeLabel: "" };

    const press = (buttons, active) => buttons.forEach((b) => b.setAttribute("aria-pressed", String(b === active)));

    function emit() {
      dateInput.value = pick.date;
      timeInput.value = pick.time;
      stepTime.setAttribute("aria-disabled", String(!pick.date));
      if (!slotsUrl || !pick.date) {
        slotsState.hidden = Boolean(pick.date);
        if (!pick.date) slotsState.textContent = "ابتدا روز را انتخاب کنید.";
      }
      onChange(Object.assign({}, pick));
    }

    function pickDay(btn) {
      press(days, btn);
      press(slots, null);
      const name = btn.querySelector(".day__name").textContent;
      const month = btn.querySelector(".day__month");
      const num = btn.querySelector(".day__num").textContent + (month ? " " + month.textContent : "");
      Object.assign(pick, { date: btn.dataset.date, dayLabel: name + " " + num, time: "", timeLabel: "" });
      emit();
      if (slotsUrl) loadSlots(btn.dataset.date);
    }

    // ---------- ساعت‌های آزاد از سرور ----------
    function params(date) {
      const p = new URLSearchParams();
      p.set("date", date);
      root.querySelectorAll("input[name=serviceIds]:checked").forEach((i) => p.append("serviceIds", i.value));
      const staff = root.querySelector("input[name=staffId]:checked, select[name=staffId]");
      if (staff && staff.value) p.set("staffId", staff.value);
      const id = new URLSearchParams(location.search).get("id");
      if (id) p.set("id", id);
      return p;
    }

    function renderSlots(list) {
      slotsBox.innerHTML = "";
      const groups = [["صبح", (h) => h < 12], ["بعدازظهر", (h) => h >= 12 && h < 17], ["عصر", (h) => h >= 17]];
      groups.forEach(([title, inGroup]) => {
        const items = list.filter((s) => inGroup(Number(s.time.split(":")[0])));
        if (!items.length) return;
        const head = document.createElement("p");
        head.className = "slot-group";
        head.textContent = title;
        const wrap = document.createElement("div");
        wrap.className = "slots";
        items.forEach((s) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "slot";
          b.setAttribute("aria-pressed", "false");
          b.dataset.time = s.time;
          b.textContent = s.label;
          b.addEventListener("click", () => pickSlot(b));
          wrap.appendChild(b);
        });
        slotsBox.append(head, wrap);
      });
      slots = Array.from(slotsBox.querySelectorAll(".slot"));
    }

    async function loadSlots(date) {
      const mine = ++request;
      slotsBox.innerHTML = "";
      slotsState.hidden = false;
      slotsState.textContent = "در حال پیدا کردن ساعت‌های آزاد…";
      try {
        const res = await fetch(slotsUrl + "?" + params(date).toString(), { credentials: "same-origin", headers: { Accept: "application/json" } });
        const data = await res.json();
        if (mine !== request) return; // روز دیگری انتخاب شده
        renderSlots(data.slots || []);
        slotsState.hidden = slots.length > 0;
        slotsState.textContent = data.message || "در این روز ساعت آزادی نیست؛ روز دیگری را امتحان کنید.";
      } catch (e) {
        if (mine !== request) return;
        slotsState.hidden = false;
        slotsState.textContent = "ساعت‌ها گرفته نشد؛ اینترنت را بررسی و دوباره روز را انتخاب کنید.";
      }
    }

    function pickSlot(btn) {
      press(slots, btn);
      Object.assign(pick, { time: btn.dataset.time, timeLabel: btn.textContent.trim() });
      emit();
    }

    function reset() {
      press(days, null);
      press(slots, null);
      if (slotsUrl) { request++; slotsBox.innerHTML = ""; slots = []; }
      Object.assign(pick, { date: "", time: "", dayLabel: "", timeLabel: "" });
      emit();
    }

    // refresh: خدمت یا آرایشگر عوض شد؛ روز و ساعت انتخاب‌شده می‌ماند مگر دیگر آزاد نباشد.
    // بدون بک‌اند ساعت‌ها ثابت‌اند و چیزی عوض نمی‌شود؛ با بک‌اند ساعت‌های همان روز دوباره گرفته می‌شود.
    async function refresh() {
      if (!pick.date || !slotsUrl) return false;
      const keep = pick.time;
      await loadSlots(pick.date);
      const again = keep && slots.find((b) => b.dataset.time === keep && !b.disabled);
      if (again) { pickSlot(again); return false; }
      if (keep) { Object.assign(pick, { time: "", timeLabel: "" }); emit(); return true; } // ساعت قبلی دیگر آزاد نیست
      return false;
    }

    days.forEach((btn) => btn.addEventListener("click", () => pickDay(btn)));
    if (slotsUrl) slotsBox.innerHTML = ""; // ساعت‌های نمونه با بک‌اند نشان داده نمی‌شوند
    else slots.forEach((btn) => btn.addEventListener("click", () => pickSlot(btn)));
    emit();

    return { reset, refresh };
  }

  window.SalonSlotPicker = { mount };
})();
