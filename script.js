/* Power Tools — Product Catalog interactions */
(function () {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const phone = '201093616909';

  /* ---------------- Mobile navigation ---------------- */
  const menuBtn = $('.menu-btn');
  const mobileNav = $('.nav');
  if (menuBtn && mobileNav) {
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.addEventListener('click', () => {
      const open = mobileNav.classList.toggle('mobile-open');
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.textContent = open ? '✕' : '☰';
    });
    $$('.nav a').forEach(link => link.addEventListener('click', () => {
      mobileNav.classList.remove('mobile-open');
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.textContent = '☰';
    }));
    document.addEventListener('click', e => {
      if (window.innerWidth <= 760 && mobileNav.classList.contains('mobile-open') && !mobileNav.contains(e.target) && !menuBtn.contains(e.target)) {
        mobileNav.classList.remove('mobile-open');
        menuBtn.setAttribute('aria-expanded', 'false');
        menuBtn.textContent = '☰';
      }
    });
  }

  /* ---------------- Arabic-safe search ---------------- */
  function normalize(value) {
    return String(value || '')
      .normalize('NFKC')
      .toLocaleLowerCase('ar')
      .replace(/[ًٌٍَُِّْـٰٱ]/g, '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/ئ/g, 'ي')
      .replace(/ؤ/g, 'و')
      .replace(/ء/g, '')
      .replace(/[ـ]/g, '')
      .replace(/[،,؛;|/\\]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const section = $('#products');
  const track = $('#productGrid');
  const viewport = $('#catalogViewport');
  const cards = track ? $$('.catalog-card', track) : [];
  const search = $('#productSearch');
  const clear = $('#clearProductSearch');
  const noResults = $('#productNoResults');
  const categoryButtons = $$('.catalog-category');
  const quickButtons = $$('.catalog-quick');
  const advancedWrap = $('#catalogAdvancedWrap');
  const advancedBtn = $('#catalogAdvancedBtn');
  const advancedMenu = $('#catalogAdvancedMenu');
  const resetBtn = $('#resetCatalog');
  const prev = $('#catalogPrev');
  const next = $('#catalogNext');
  const dots = $('#catalogDots');
  const currentLabel = $('#catalogPageCurrent');
  const totalLabel = $('#catalogPageTotal');

  if (!section || !track || !cards.length) return;

  let activeCategory = 'all';
  let activeQuick = 'all';
  let filtered = cards.slice();
  let page = 0;
  let autoTimer = null;
  let pointerDown = false;
  let pointerStart = 0;
  let pointerDelta = 0;

  function perView() {
    if (window.innerWidth <= 620) return 1;
    if (window.innerWidth <= 980) return 2;
    return 4;
  }

  function pagesCount() {
    return Math.max(1, Math.ceil(filtered.length / perView()));
  }

  function buildSearchText(card) {
    return normalize([
      card.dataset.search || '',
      card.dataset.brand || '',
      card.dataset.cat || '',
      card.textContent || ''
    ].join(' '));
  }

  const searchIndex = new Map(cards.map(card => [card, buildSearchText(card)]));


  function searchMatches(card, query) {
    if (!query) return true;
    const haystack = searchIndex.get(card) || '';
    return query.split(' ').filter(Boolean).every(token => haystack.includes(token));
  }

  function quickMatches(card) {
    if (activeQuick === 'all') return true;
    if (activeQuick === 'popular') return card.dataset.popular === 'true';
    if (activeQuick === 'available') return card.dataset.status === 'available';
    if (activeQuick === 'workshop') return (card.dataset.audience || '').split(/\s+/).includes('workshop');
    if (activeQuick === 'factory') return (card.dataset.audience || '').split(/\s+/).includes('factory');
    if (activeQuick === 'global') return card.dataset.global === 'true';
    return true;
  }

  function applyFilters(options = {}) {
    const query = normalize(search ? search.value : '');
    filtered = cards.filter(card => {
      const catOK = activeCategory === 'all' || card.dataset.cat === activeCategory;
      return catOK && quickMatches(card) && searchMatches(card, query);
    });

    cards.forEach(card => card.classList.toggle('catalog-hidden', !filtered.includes(card)));
    page = Math.min(page, pagesCount() - 1);
    if (options.resetPage !== false) page = 0;

    if (clear) clear.hidden = !query;
    if (noResults) noResults.hidden = filtered.length !== 0;
    renderDots();
    renderPosition();
    updateButtons();
    updateQuickUI();
    closeAdvanced();
    restartAuto();
  }

  function renderDots() {
    if (!dots) return;
    dots.innerHTML = '';
    const total = pagesCount();
    const visibleDots = Math.min(total, 8);
    for (let i = 0; i < visibleDots; i++) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'catalog-dot' + (i === page ? ' active' : '');
      dot.setAttribute('aria-label', `صفحة ${i + 1}`);
      dot.addEventListener('click', () => goToPage(i));
      dots.appendChild(dot);
    }
  }

  function renderPosition() {
    const total = pagesCount();
    const n = String(page + 1).padStart(2, '0');
    const t = String(total).padStart(2, '0');
    if (currentLabel) currentLabel.textContent = n;
    if (totalLabel) totalLabel.textContent = t;
    const count = perView();
    const start = page * count;
    const end = Math.min(start + count, filtered.length);
    const visibleSet = new Set(filtered.slice(start, end));
    // Only mount the current page visually. This keeps 160+ products lightweight
    // and prevents the old 16-card grid from creating extra rows or broken slides.
    cards.forEach(card => card.classList.toggle('catalog-page-visible', visibleSet.has(card)));
    track.style.setProperty('--catalog-shift', '0%');
  }

  function updateButtons() {
    const disabled = pagesCount() <= 1 || filtered.length === 0;
    if (prev) prev.disabled = disabled;
    if (next) next.disabled = disabled;
  }

  function goToPage(target) {
    const total = pagesCount();
    if (!filtered.length) return;
    page = (target + total) % total;
    renderDots();
    renderPosition();
    updateButtons();
    restartAuto();
  }

  function restartAuto() {
    clearInterval(autoTimer);
    if (pagesCount() > 1 && filtered.length > perView()) {
      autoTimer = setInterval(() => goToPage(page + 1), 10000);
    }
  }

  function updateQuickUI() {
    quickButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.quick === activeQuick));
  }

  function setCategory(value) {
    activeCategory = value;
    categoryButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === value));
    page = 0;
    applyFilters();
  }

  function setQuick(value) {
    activeQuick = value;
    page = 0;
    applyFilters();
  }

  categoryButtons.forEach(btn => btn.addEventListener('click', () => setCategory(btn.dataset.filter || 'all')));
  quickButtons.forEach(btn => btn.addEventListener('click', () => setQuick(btn.dataset.quick || 'all')));

  if (resetBtn) resetBtn.addEventListener('click', () => {
    activeCategory = 'all';
    activeQuick = 'all';
    if (search) search.value = '';
    page = 0;
    categoryButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === 'all'));
    applyFilters();
  });

  if (search) {
    search.addEventListener('input', () => {
      // Searching should never be blocked by the default "الأكثر طلبًا" quick filter.
      // Keep category filtering intact, but let the query search the full catalog.
      const hasQuery = normalize(search.value).length > 0;
      if (hasQuery) {
        activeQuick = 'all';
      }
      page = 0;
      applyFilters();
    });
    search.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyFilters();
      }
      if (e.key === 'Escape') {
        search.value = '';
        applyFilters();
        search.focus();
      }
    });
  }

  if (clear) clear.addEventListener('click', () => {
    if (!search) return;
    search.value = '';
    page = 0;
    applyFilters();
    search.focus();
  });

  if (advancedBtn && advancedMenu) {
    advancedBtn.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = !advancedMenu.hidden;
      advancedMenu.hidden = isOpen;
      advancedBtn.setAttribute('aria-expanded', String(!isOpen));
    });
    $$('.catalog-advanced-menu button', advancedMenu).forEach(btn => btn.addEventListener('click', () => setQuick(btn.dataset.quick || 'all')));
    document.addEventListener('click', e => {
      if (advancedWrap && !advancedWrap.contains(e.target)) closeAdvanced();
    });
  }

  function closeAdvanced() {
    if (advancedMenu) advancedMenu.hidden = true;
    if (advancedBtn) advancedBtn.setAttribute('aria-expanded', 'false');
  }

  if (prev) prev.addEventListener('click', () => goToPage(page - 1));
  if (next) next.addEventListener('click', () => goToPage(page + 1));

  /* Pointer swipe: only the catalog viewport moves; the document never jumps. */
  if (viewport) {
    viewport.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      pointerDown = true;
      pointerStart = e.clientX;
      pointerDelta = 0;
      viewport.setPointerCapture?.(e.pointerId);
      clearInterval(autoTimer);
    });
    viewport.addEventListener('pointermove', e => {
      if (!pointerDown) return;
      pointerDelta = e.clientX - pointerStart;
    });
    const finishSwipe = () => {
      if (!pointerDown) return;
      pointerDown = false;
      if (Math.abs(pointerDelta) > 55) {
        goToPage(pointerDelta > 0 ? page - 1 : page + 1);
      } else {
        restartAuto();
      }
      pointerDelta = 0;
    };
    viewport.addEventListener('pointerup', finishSwipe);
    viewport.addEventListener('pointercancel', finishSwipe);
  }

  /* WhatsApp links: generated from each real product name/spec. */
  cards.forEach(card => {
    const link = $('.catalog-wa', card);
    const name = $('h3', card)?.textContent.trim() || 'منتج';
    const spec = $('p', card)?.textContent.trim() || '';
    if (link) {
      link.href = `https://wa.me/${phone}?text=${encodeURIComponent(`السلام عليكم، أريد معرفة سعر وتوافر ${name}${spec ? ` - ${spec}` : ''}`)}`;
    }
  });


  window.addEventListener('resize', () => {
    page = 0;
    renderDots();
    renderPosition();
    updateButtons();
    restartAuto();
  }, { passive: true });

  /* Navigation active state: Hero uses #home; keep home link pointing to #top. */
  const navLinks = $$('.nav a');
  const sections = $$('main section[id]');
  if (navLinks.length && sections.length) {
    const updateActive = () => {
      const y = window.scrollY + 140;
      let current = 'top';
      sections.forEach(s => { if (y >= s.offsetTop) current = s.id; });
      navLinks.forEach(link => {
        const href = link.getAttribute('href');
        const isHome = href === '#top' && (current === 'home' || current === 'top');
        link.classList.toggle('active', href === `#${current}` || isHome);
      });
    };
    window.addEventListener('scroll', updateActive, { passive: true });
    updateActive();
  }

  applyFilters();
})();
