const filters = document.querySelectorAll('.filter');
const cards = [...document.querySelectorAll('.product-card')];
const productGrid = document.querySelector('#productGrid');

let carouselWrap = null;
let prevBtn = null;
let nextBtn = null;
let dotsWrap = null;
let hint = null;

let autoTimer = null;
let currentPage = 0;

let isDragging = false;
let dragStartX = 0;
let dragStartScroll = 0;


/* =========================================
   CAROUSEL SETTINGS
   ========================================= */

function getVisibleCards() {
  return cards.filter(card => !card.classList.contains('hidden'));
}

function getCardsPerView() {
  if (window.innerWidth <= 760) return 1;
  if (window.innerWidth <= 1000) return 2;
  return 3;
}

function getPageCount() {
  const visible = getVisibleCards();
  const perView = getCardsPerView();

  return Math.max(1, Math.ceil(visible.length / perView));
}


/* =========================================
   CREATE CAROUSEL CONTROLS
   ========================================= */

function buildCarouselUI() {

  if (!productGrid) return;

  carouselWrap = productGrid.parentElement;

  carouselWrap.classList.add('product-carousel-wrap');


  /* PREVIOUS BUTTON */

  if (!prevBtn) {

    prevBtn = document.createElement('button');

    prevBtn.className =
      'carousel-arrow carousel-prev';

    prevBtn.type = 'button';

    prevBtn.setAttribute(
      'aria-label',
      'المنتج السابق'
    );

    prevBtn.innerHTML = '‹';


    /* NEXT BUTTON */

    nextBtn = document.createElement('button');

    nextBtn.className =
      'carousel-arrow carousel-next';

    nextBtn.type = 'button';

    nextBtn.setAttribute(
      'aria-label',
      'المنتج التالي'
    );

    nextBtn.innerHTML = '›';


    /* DOTS */

    dotsWrap = document.createElement('div');

    dotsWrap.className =
      'carousel-dots';

    dotsWrap.setAttribute(
      'aria-label',
      'صفحات المنتجات'
    );


    /* SWIPE HINT */

    hint = document.createElement('div');

    hint.className =
      'carousel-hint';

    hint.textContent =
      'اسحب يمين أو شمال لعرض المزيد';


    carouselWrap.appendChild(prevBtn);

    carouselWrap.appendChild(nextBtn);

    carouselWrap.appendChild(dotsWrap);

    carouselWrap.appendChild(hint);


    /* BUTTON EVENTS */

    prevBtn.addEventListener(
      'click',
      () => goToPage(currentPage - 1)
    );

    nextBtn.addEventListener(
      'click',
      () => goToPage(currentPage + 1)
    );


    /* MOUSE + TOUCH DRAG */

    productGrid.addEventListener(
      'pointerdown',
      startDrag
    );

    productGrid.addEventListener(
      'pointermove',
      dragMove
    );

    productGrid.addEventListener(
      'pointerup',
      endDrag
    );

    productGrid.addEventListener(
      'pointercancel',
      endDrag
    );

    productGrid.addEventListener(
      'pointerleave',
      endDrag
    );


    productGrid.addEventListener(
      'scroll',
      updatePageFromScroll,
      { passive: true }
    );
  }


  renderDots();

  updateArrows();
}


/* =========================================
   DOTS
   ========================================= */

function renderDots() {

  if (!dotsWrap) return;

  const pageCount = getPageCount();

  dotsWrap.innerHTML = '';


  for (let i = 0; i < pageCount; i++) {

    const dot =
      document.createElement('button');

    dot.type = 'button';

    dot.className =
      'carousel-dot' +
      (i === currentPage ? ' active' : '');

    dot.setAttribute(
      'aria-label',
      `الصفحة ${i + 1}`
    );


    dot.addEventListener(
      'click',
      () => goToPage(i)
    );


    dotsWrap.appendChild(dot);
  }
}


/* =========================================
   UPDATE DOTS
   ========================================= */

function updateDots() {

  if (!dotsWrap) return;

  [...dotsWrap.children].forEach(
    (dot, index) => {

      dot.classList.toggle(
        'active',
        index === currentPage
      );

    }
  );
}


/* =========================================
   UPDATE ARROWS
   ========================================= */

function updateArrows() {

  const pageCount = getPageCount();

  if (prevBtn) {
    prevBtn.disabled =
      pageCount <= 1;
  }

  if (nextBtn) {
    nextBtn.disabled =
      pageCount <= 1;
  }
}


/* =========================================
   GO TO PAGE
   ========================================= */

function goToPage(page) {

  const visible =
    getVisibleCards();

  const perView =
    getCardsPerView();

  const pageCount =
    getPageCount();


  if (!visible.length) return;


  /* LOOP */

  currentPage =
    (page + pageCount) % pageCount;


  const targetIndex =
    Math.min(
      currentPage * perView,
      visible.length - 1
    );


  const target =
    visible[targetIndex];


  if (target) {

    target.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'start'
    });

  }


  updateDots();

  restartAutoScroll();
}


/* =========================================
   DETECT CURRENT PAGE
   ========================================= */

function updatePageFromScroll() {

  if (isDragging) return;

  const visible =
    getVisibleCards();

  if (!visible.length) return;


  const perView =
    getCardsPerView();

  const gridRect =
    productGrid.getBoundingClientRect();


  let bestIndex = 0;

  let bestDistance =
    Infinity;


  visible.forEach(
    (card, index) => {

      const rect =
        card.getBoundingClientRect();


      const distance =
        Math.abs(
          rect.right -
          gridRect.right
        );


      if (distance < bestDistance) {

        bestDistance =
          distance;

        bestIndex =
          index;
      }

    }
  );


  currentPage =
    Math.floor(
      bestIndex / perView
    );


  updateDots();
}


/* =========================================
   AUTO SCROLL
   EVERY 10 SECONDS
   ========================================= */

function restartAutoScroll() {

  clearInterval(autoTimer);


  if (getPageCount() <= 1) {
    return;
  }


  autoTimer =
    setInterval(
      () => {

        goToPage(
          currentPage + 1
        );

      },
      10000
    );
}


/* =========================================
   DRAG START
   ========================================= */

function startDrag(e) {

  if (
    e.pointerType === 'mouse' &&
    e.button !== 0
  ) {
    return;
  }


  isDragging = true;


  dragStartX =
    e.clientX;


  dragStartScroll =
    productGrid.scrollLeft;


  productGrid.classList.add(
    'is-dragging'
  );


  if (
    productGrid.setPointerCapture
  ) {

    productGrid.setPointerCapture(
      e.pointerId
    );

  }


  clearInterval(autoTimer);
}


/* =========================================
   DRAG MOVE
   ========================================= */

function dragMove(e) {

  if (!isDragging) return;


  const distance =
    e.clientX -
    dragStartX;


  productGrid.scrollLeft =
    dragStartScroll -
    distance;
}


/* =========================================
   DRAG END
   ========================================= */

function endDrag() {

  if (!isDragging) return;


  isDragging = false;


  productGrid.classList.remove(
    'is-dragging'
  );


  updatePageFromScroll();


  restartAutoScroll();
}


/* =========================================
   FILTERS
   ========================================= */

filters.forEach(
  btn => {

    btn.addEventListener(
      'click',
      () => {

        filters.forEach(
          b =>
            b.classList.remove(
              'active'
            )
        );


        btn.classList.add(
          'active'
        );


        const filter =
          btn.dataset.filter;


        cards.forEach(
          card => {

            card.classList.toggle(
              'hidden',
              filter !== 'all' &&
              card.dataset.cat !== filter
            );

          }
        );


        currentPage = 0;


        requestAnimationFrame(
          () => {

            buildCarouselUI();


            const visible =
              getVisibleCards();


            if (visible[0]) {

              visible[0].scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'start'
              });

            }


            renderDots();

            updateArrows();

            restartAutoScroll();

          }
        );

      }
    );

  }
);


/* =========================================
   NAVIGATION ACTIVE STATE
   ========================================= */

const navLinks =
  document.querySelectorAll(
    '.nav a'
  );


const sections =
  [
    ...document.querySelectorAll(
      'main section[id]'
    )
  ];


window.addEventListener(
  'scroll',
  () => {

    const y =
      window.scrollY + 120;


    let current =
      'top';


    sections.forEach(
      section => {

        if (
          y >= section.offsetTop
        ) {

          current =
            section.id;

        }

      }
    );


    navLinks.forEach(
      link => {

        link.classList.toggle(
          'active',
          link.getAttribute('href') ===
          `#${current}`
        );

      }
    );

  }
);


/* =========================================
   RESIZE
   ========================================= */

window.addEventListener(
  'resize',
  () => {

    currentPage = 0;


    requestAnimationFrame(
      () => {

        buildCarouselUI();


        const visible =
          getVisibleCards();


        if (visible[0]) {

          visible[0].scrollIntoView({
            behavior: 'auto',
            block: 'nearest',
            inline: 'start'
          });

        }


        renderDots();

        updateArrows();

        restartAutoScroll();

      }
    );

  }
);


/* =========================================
   START CAROUSEL
   ========================================= */

if (productGrid) {

  buildCarouselUI();

  restartAutoScroll();

}
