(() => {
  const FREE_IMAGE_LIMIT = 5; // Bepul maksimal 5 ta rasm
  const DAILY_FREE_POST_LIMIT = 2; // Kunlik bepul e'lon limiti
  const PREMIUM_DAILY_POST_LIMIT = 20;

  const STORAGE_KEYS = {
    listings: "gulshan_listings_v1",
    dailyUsage: "gulshan_daily_usage_v1",
    isPremium: "gulshan_is_premium_v1",
    user: "gulshan_user_v1",
    seededDefaults: "gulshan_seeded_defaults_v1"
  };

  let activeCategory = "Hammasi";
  let searchQuery = "";

  const $ = (id) => document.getElementById(id);

  function getCurrentUser() {
    const u = localStorage.getItem(STORAGE_KEYS.user);
    return u ? u.trim() : "";
  }

  function canDeleteItem(item) {
    const currentUser = getCurrentUser();
    return Boolean(currentUser && item && item.owner && item.owner === currentUser);
  }

  function getTodayKey() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function loadListings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.listings);
      if (!raw) {
        localStorage.setItem(STORAGE_KEYS.listings, JSON.stringify([]));
        return [];
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      // Agar avvalgi versiyadan qolgan namuna e'lonlar (id: 1, 2, 3 va owner: null) bo'lsa, tozalanadi
      const legacyTitles = [
        "Yangi sazan baliq",
        "Mahalliy non va sut mahsulotlari",
        "Haftalik oziq-ovqat aksiyasi"
      ];
      const hasLegacyDefaults = parsed.some(
        (item) =>
          item &&
          item.owner === null &&
          [1, 2, 3].includes(Number(item.id)) &&
          legacyTitles.includes(item.title)
      );

      if (hasLegacyDefaults) {
        const cleaned = parsed.filter(
          (item) =>
            !(
              item &&
              item.owner === null &&
              [1, 2, 3].includes(Number(item.id)) &&
              legacyTitles.includes(item.title)
            )
        );
        localStorage.setItem(STORAGE_KEYS.listings, JSON.stringify(cleaned));
        return cleaned;
      }

      return parsed;
    } catch {
      return [];
    }
  }

  function saveListings(items) {
    localStorage.setItem(STORAGE_KEYS.listings, JSON.stringify(items));
  }

  function isPremiumActive() {
    return localStorage.getItem(STORAGE_KEYS.isPremium) === "true";
  }

  function getTodayPostCount() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.dailyUsage);
      if (!raw) return 0;
      const data = JSON.parse(raw);
      if (data.date !== getTodayKey()) return 0;
      return Number(data.count) || 0;
    } catch {
      return 0;
    }
  }

  function incrementTodayPostCount() {
    const today = getTodayKey();
    const nextCount = getTodayPostCount() + 1;
    localStorage.setItem(
      STORAGE_KEYS.dailyUsage,
      JSON.stringify({ date: today, count: nextCount })
    );
    return nextCount;
  }

  function hasReachedDailyLimit() {
    const limit = isPremiumActive() ? PREMIUM_DAILY_POST_LIMIT : DAILY_FREE_POST_LIMIT;
    return getTodayPostCount() >= limit;
  }

  function openModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove("hidden");
    modalEl.classList.add("flex");
  }

  function closeModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.add("hidden");
    modalEl.classList.remove("flex");
  }

  function openPremiumModal(customReason) {
    const reasonEl = $("premiumReasonText");
    if (reasonEl && customReason) {
      reasonEl.textContent = customReason;
    }
    openModal($("premiumModal"));
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function openAuthDialog(titleText, preffillName = "") {
    if ($("authModalTitle")) {
      $("authModalTitle").textContent = titleText;
    }
    if ($("authName")) {
      $("authName").value = preffillName;
    }
    openModal($("authModal"));
    setTimeout(() => $("authName")?.focus(), 50);
  }

  function updateStatusUI() {
    const badge = $("statusBadge");
    const limitLabel = $("imageLimitLabel");
    const hint = $("imageHint");
    const used = getTodayPostCount();

    if (isPremiumActive()) {
      if (badge) {
        badge.textContent = `Premium faol (bugun ${used}/${PREMIUM_DAILY_POST_LIMIT} ta e’lon)`;
      }
      if (limitLabel) limitLabel.textContent = `${FREE_IMAGE_LIMIT} tagacha`;
      if (hint) hint.textContent = `Maksimal ${FREE_IMAGE_LIMIT} ta rasm tanlash mumkin.`;
    } else {
      if (badge) {
        badge.textContent = `Bepul tarif (bugun ${used}/${DAILY_FREE_POST_LIMIT} ta e’lon, ${FREE_IMAGE_LIMIT} tagacha rasm)`;
      }
      if (limitLabel) limitLabel.textContent = `${FREE_IMAGE_LIMIT} tagacha`;
      if (hint) {
        hint.textContent = `Bepul tarifda maksimal ${FREE_IMAGE_LIMIT} ta rasm. Kunlik limit (${DAILY_FREE_POST_LIMIT} ta) to‘lganda Premium oynasi avtomatik chiqadi.`;
      }
    }

    const user = getCurrentUser();
    const authHeader = $("authHeaderActions");
    if (!authHeader) return;

    if (user) {
      const actionLabel = user === "Mehmon" ? "Ro‘yxatdan o‘tish" : "O‘zgartirish";
      authHeader.innerHTML = `
        <span class="px-3 py-1.5 rounded-lg bg-slate-800 text-emerald-300 text-xs sm:text-sm font-medium">${escapeHtml(user)}</span>
        <button id="editAccountBtn" type="button" class="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-semibold cursor-pointer">
          ${actionLabel}
        </button>
      `;

      $("editAccountBtn")?.addEventListener("click", () => {
        openAuthDialog(
          user === "Mehmon" ? "Ro‘yxatdan o‘tish" : "Ismni o‘zgartirish",
          user === "Mehmon" ? "" : user
        );
      });
    } else {
      authHeader.innerHTML = `
        <button id="loginBtn" type="button" class="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium cursor-pointer">
          Kirish
        </button>
        <button id="registerBtn" type="button" class="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold cursor-pointer">
          Ro‘yxatdan o‘tish
        </button>
      `;

      $("loginBtn")?.addEventListener("click", () => openAuthDialog("Kirish", ""));
      $("registerBtn")?.addEventListener("click", () => openAuthDialog("Ro‘yxatdan o‘tish", ""));
    }
  }

  function renderListings() {
    const grid = $("listingsGrid");
    const emptyState = $("emptyState");
    if (!grid) return;

    const all = loadListings();
    const q = searchQuery.trim().toLowerCase();

    const filtered = all.filter((item) => {
      const matchesCat = activeCategory === "Hammasi" || item.category === activeCategory;
      const matchesQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.desc && item.desc.toLowerCase().includes(q));
      return matchesCat && matchesQuery;
    });

    if (filtered.length === 0) {
      grid.innerHTML = "";
      emptyState?.classList.remove("hidden");
      return;
    }

    emptyState?.classList.add("hidden");
    grid.innerHTML = filtered
      .map((item) => {
        const deleteButtonHtml = canDeleteItem(item)
          ? `<button type="button" data-delete-id="${item.id}" class="delete-post-btn px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-medium cursor-pointer">
              O‘chirish
            </button>`
          : "";

        return `
        <article class="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-3 fade-up">
          <div class="space-y-2">
            ${
              Array.isArray(item.images) && item.images.length > 0
                ? `<img src="${item.images[0]}" alt="${escapeHtml(item.title)}" class="w-full h-40 object-cover rounded-xl bg-slate-800" />`
                : ""
            }
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 font-medium">
                ${escapeHtml(item.category)}
              </span>
              <span class="text-sm font-bold text-white">${escapeHtml(item.price)}</span>
            </div>
            <h3 class="text-base font-bold text-white">${escapeHtml(item.title)}</h3>
            ${item.desc ? `<p class="text-xs sm:text-sm text-slate-400">${escapeHtml(item.desc)}</p>` : ""}
          </div>

          <div class="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 text-xs text-slate-300">
            <span class="truncate">Tel: ${escapeHtml(item.phone)}</span>
            <div class="flex items-center gap-2 shrink-0">
              <a href="tel:${escapeHtml(item.phone.replace(/\s+/g, ""))}" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 font-medium">
                Qo‘ng‘iroq
              </a>
              ${deleteButtonHtml}
            </div>
          </div>
        </article>
      `;
      })
      .join("");
  }

  function readFilesAsDataUrls(files) {
    return Promise.all(
      files.map(
        (file) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          })
      )
    );
  }

  function initEvents() {
    // Kategoriya tugmalari
    const filtersEl = $("categoryFilters");
    if (filtersEl) {
      filtersEl.addEventListener("click", (e) => {
        const btn = e.target.closest(".cat-btn");
        if (!btn) return;
        activeCategory = btn.dataset.category || "Hammasi";
        filtersEl.querySelectorAll(".cat-btn").forEach((b) => {
          b.classList.toggle("active", b === btn);
        });
        renderListings();
      });
    }

    // E'lon kartochkasidagi "O'chirish" tugmasi (faqat e'lon egasi o'chira oladi)
    const gridEl = $("listingsGrid");
    if (gridEl) {
      gridEl.addEventListener("click", (e) => {
        const delBtn = e.target.closest("[data-delete-id]");
        if (!delBtn) return;

        const targetId = Number(delBtn.dataset.deleteId);
        const currentList = loadListings();
        const targetItem = currentList.find((item) => item.id === targetId);

        if (!canDeleteItem(targetItem)) {
          alert("Faqat o‘zingiz qo‘shgan e’lonni o‘chira olasiz!");
          renderListings();
          return;
        }

        const updated = currentList.filter((item) => item.id !== targetId);
        saveListings(updated);
        renderListings();
      });
    }

    // Qidiruv
    const searchInput = $("searchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value || "";
        renderListings();
      });
    }

    // E'lon qo'shish tugmasi -> kunlik limit to'lgan bo'lsa Premium oynasini avtomatik ochadi
    $("openPostModalBtn")?.addEventListener("click", () => {
      if (hasReachedDailyLimit()) {
        openPremiumModal(
          `Bugungi bepul e’lon limiti (${DAILY_FREE_POST_LIMIT} ta) to‘ldi. Yangi e’lon qo‘shishni davom ettirish uchun Premium tarifni faollashtiring.`
        );
        return;
      }
      openModal($("postModal"));
    });

    // Rasm sonini 5 taga cheklash
    $("postImages")?.addEventListener("change", (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length > FREE_IMAGE_LIMIT) {
        alert(`Bepul tarifda maksimal ${FREE_IMAGE_LIMIT} ta rasm yuklash mumkin. Dastlabki ${FREE_IMAGE_LIMIT} ta rasm tanlandi.`);
        const dt = new DataTransfer();
        files.slice(0, FREE_IMAGE_LIMIT).forEach((f) => dt.items.add(f));
        e.target.files = dt.files;
      }
    });

    // E'lon yuborish
    $("postForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (hasReachedDailyLimit()) {
        closeModal($("postModal"));
        openPremiumModal(
          `Kunlik e’lon limiti to‘ldi. E’lon joylashni davom ettirish uchun Premium tarifni faollashtiring.`
        );
        return;
      }

      const files = Array.from($("postImages")?.files || []).slice(0, FREE_IMAGE_LIMIT);
      const images = files.length > 0 ? await readFilesAsDataUrls(files) : [];
      const currentUser = getCurrentUser() || "Mehmon";

      if (!getCurrentUser()) {
        localStorage.setItem(STORAGE_KEYS.user, currentUser);
      }

      const newItem = {
        id: Date.now(),
        owner: currentUser,
        title: $("postTitle").value.trim(),
        category: $("postCategory").value,
        price: $("postPrice").value.trim(),
        phone: $("postPhone").value.trim(),
        desc: $("postDesc").value.trim(),
        images
      };

      const updated = [newItem, ...loadListings()];
      saveListings(updated);
      const newCount = incrementTodayPostCount();

      $("postForm").reset();
      closeModal($("postModal"));
      updateStatusUI();
      renderListings();

      const limit = isPremiumActive() ? PREMIUM_DAILY_POST_LIMIT : DAILY_FREE_POST_LIMIT;
      if (!isPremiumActive() && newCount >= limit) {
        openPremiumModal(
          `Bugungi ${DAILY_FREE_POST_LIMIT} ta bepul e’lon limitingiz to‘ldi. Yana e’lon qo‘shish uchun Premium tarifni faollashtiring.`
        );
      }
    });

    // Modal yopish tugmalari
    $("closePostModalBtn")?.addEventListener("click", () => closeModal($("postModal")));
    $("cancelPostBtn")?.addEventListener("click", () => closeModal($("postModal")));

    $("openPremiumBtn")?.addEventListener("click", () => {
      openPremiumModal("Barcha qo‘shimcha imkoniyatlar va kengaytirilgan kunlik limit uchun Premium tarifni faollashtiring.");
    });
    $("closePremiumModalBtn")?.addEventListener("click", () => closeModal($("premiumModal")));
    $("closePremiumSecondaryBtn")?.addEventListener("click", () => closeModal($("premiumModal")));

    $("activatePremiumBtn")?.addEventListener("click", () => {
      localStorage.setItem(STORAGE_KEYS.isPremium, "true");
      closeModal($("premiumModal"));
      updateStatusUI();
      alert("Premium tarif faollashtirildi!");
    });

    // Kirish / Ro'yxatdan o'tish / Ismni o'zgartirish
    $("loginBtn")?.addEventListener("click", () => openAuthDialog("Kirish", ""));
    $("registerBtn")?.addEventListener("click", () => openAuthDialog("Ro‘yxatdan o‘tish", ""));
    $("closeAuthModalBtn")?.addEventListener("click", () => closeModal($("authModal")));
    $("authForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = $("authName").value.trim();
      if (name) {
        localStorage.setItem(STORAGE_KEYS.user, name);
      }
      closeModal($("authModal"));
      updateStatusUI();
      renderListings();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initEvents();
    updateStatusUI();
    renderListings();
  });
})();