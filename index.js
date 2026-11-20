(() => {
  const FREE_IMAGE_LIMIT = 5; // Bepul tarifda maksimal 5 ta rasm
  const DAILY_FREE_POST_LIMIT = 2; // Kunlik bepul e'lon limiti
  const PREMIUM_DAILY_POST_LIMIT = 20;

  const STORAGE_KEYS = {
    listings: "gulshan_listings_v1",
    dailyUsage: "gulshan_daily_usage_v1",
    isPremium: "gulshan_is_premium_v1",
    user: "gulshan_user_v1"
  };

  const DEFAULT_LISTINGS = [
    {
      id: 1,
      title: "Yangi sazan baliq",
      category: "Baliqxona",
      price: "38 000 so‘m / kg",
      phone: "+998 90 111 22 33",
      desc: "Bugun ertalab keltirilgan, toza va yangi.",
      images: []
    },
    {
      id: 2,
      title: "Mahalliy non va sut mahsulotlari",
      category: "Oziq-ovqat",
      price: "12 000 so‘m",
      phone: "+998 91 222 33 44",
      desc: "Har kuni ertalab issiq holda yetkaziladi.",
      images: []
    },
    {
      id: 3,
      title: "Haftalik oziq-ovqat aksiyasi",
      category: "Aksiya",
      price: "Chegirma 15%",
      phone: "+998 93 333 44 55",
      desc: "Tanlangan mahsulotlarga maxsus chegirma.",
      images: []
    }
  ];

  let activeCategory = "Hammasi";
  let searchQuery = "";

  const $ = (id) => document.getElementById(id);

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
        localStorage.setItem(STORAGE_KEYS.listings, JSON.stringify(DEFAULT_LISTINGS));
        return [...DEFAULT_LISTINGS];
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [...DEFAULT_LISTINGS];
    } catch {
      return [...DEFAULT_LISTINGS];
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

    const user = localStorage.getItem(STORAGE_KEYS.user);
    const authHeader = $("authHeaderActions");
    if (user && authHeader) {
      authHeader.innerHTML = `<span class="px-3 py-1.5 rounded-lg bg-slate-800 text-emerald-300 text-xs sm:text-sm font-medium">${escapeHtml(user)}</span>`;
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
      .map(
        (item) => `
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
              <button type="button" data-delete-id="${item.id}" class="delete-post-btn px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-medium cursor-pointer">
                O‘chirish
              </button>
            </div>
          </div>
        </article>
      `
      )
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

    // E'lon kartochkasidagi "O'chirish" tugmasi
    const gridEl = $("listingsGrid");
    if (gridEl) {
      gridEl.addEventListener("click", (e) => {
        const delBtn = e.target.closest("[data-delete-id]");
        if (!delBtn) return;

        const targetId = Number(delBtn.dataset.deleteId);
        const updated = loadListings().filter((item) => item.id !== targetId);
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

      const newItem = {
        id: Date.now(),
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

    // Kirish / Ro'yxatdan o'tish
    $("loginBtn")?.addEventListener("click", () => {
      $("authModalTitle").textContent = "Kirish";
      openModal($("authModal"));
    });
    $("registerBtn")?.addEventListener("click", () => {
      $("authModalTitle").textContent = "Ro‘yxatdan o‘tish";
      openModal($("authModal"));
    });
    $("closeAuthModalBtn")?.addEventListener("click", () => closeModal($("authModal")));
    $("authForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = $("authName").value.trim();
      if (name) {
        localStorage.setItem(STORAGE_KEYS.user, name);
      }
      closeModal($("authModal"));
      updateStatusUI();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initEvents();
    updateStatusUI();
    renderListings();
  });
})();