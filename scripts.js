console.debug("%cScripts.js loaded", "color: lightgreen;");

let lenis;

// Lenis setup
function setupLenis() {
  lenis = new Lenis();

  lenis.on("scroll", ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);

  lenis.start();

  let isPaused = false;
}

function swipers() {
	// Podcast Slider
  if (document.querySelector(".swiper.podcast-eps_slider_main-swiper")) {
    console.log("podcast swiper(s) exists");
    const podcastSwiperWraps = document.querySelectorAll(".podcast-eps_wrap");
    podcastSwiperWraps.forEach((wrap) => {
      const mainSwiperEl = wrap.querySelector(".swiper.podcast-eps_slider_main-swiper");
      const thumbSwiperEl = wrap.querySelector(
        ".swiper.podcast-eps_slider_thumb-swiper-1"
      );
      const thumbSwiperEl2 = wrap.querySelector(
        ".swiper.podcast-eps_slider_thumb-swiper-2"
      );
      const prevBtn = wrap.querySelector(".podcast-eps_slider_nav_prev");
      const nextBtn = wrap.querySelector(".podcast-eps_slider_nav_next");

      const mainSwiper = new Swiper(mainSwiperEl, {
        slidesPerView: 1,
        spaceBetween: 20,
        speed: 650,
        loop: true,
        initialSlide: 0,
        // effect: "fade",
        // virtualTranslate: true,
        allowTouchMove: false,
        // navigation: {
        //   prevEl: prevBtn,
        //   nextEl: nextBtn,
        // },
        navigation: false, // Disable default navigation
      });

      const thumbSwiper = new Swiper(thumbSwiperEl, {
        slidesPerView: 1,
        spaceBetween: 20,
        speed: 500,
        speed: 700,
        loop: true,
        initialSlide: 1,
        // effect: "fade",
        // virtualTranslate: true,
        allowTouchMove: false,
        // navigation: {
        //   prevEl: prevBtn,
        //   nextEl: nextBtn,
        // },
        navigation: false, // Disable default navigation
      });

      const thumbSwiper2 = new Swiper(thumbSwiperEl2, {
        slidesPerView: 1,
        spaceBetween: 20,
        speed: 300,
        speed: 700,
        loop: true,
        initialSlide: 2,
        // effect: "fade",
        // virtualTranslate: true,
        allowTouchMove: false,
        // navigation: {
        //   prevEl: prevBtn,
        //   nextEl: nextBtn,
        // },
        navigation: false, // Disable default navigation
      });

      let isAnimating = false;
      const delay = 750;

      prevBtn.addEventListener("click", () => {
        if (!isAnimating) {
          isAnimating = true;
          mainSwiper.slidePrev();
          thumbSwiper.slidePrev();
          thumbSwiper2.slidePrev();
          setTimeout(() => {
            isAnimating = false;
          }, delay);
        }
      });

      nextBtn.addEventListener("click", () => {
        if (!isAnimating) {
          isAnimating = true;
          mainSwiper.slideNext();
          thumbSwiper.slideNext();
          thumbSwiper2.slideNext();
          setTimeout(() => {
            isAnimating = false;
          }, delay);
        }
      });
    });
  }
};

function workSectionScrollLock(){
  // Initialize all carousel sections on the page
  document.querySelectorAll('.work-sl_contain').forEach((container, containerIndex) => {
    
    // Get elements within this specific container
    const carouselLayout = container.querySelector('.work-sl_layout.is-carousel-layout');
    const collectionWrap = container.querySelector('.work-sl_collection_wrap');
    const collectionList = container.querySelector('.work-sl_collection_list');
    const collectionItems = container.querySelectorAll('.work-sl_collection_item');
    const progressBar = container.querySelector('.work-sl_carousel_progress');

    // Function to calculate scroll distance (will be called on refresh)
    const getScrollDistance = () => {
      const computedStyle = window.getComputedStyle(collectionList);
      const paddingLeft = parseFloat(computedStyle.paddingLeft);
      const paddingRight = parseFloat(computedStyle.paddingRight);
      const totalPadding = paddingLeft + paddingRight;
      return collectionWrap.scrollWidth - window.innerWidth + totalPadding;
    };
    
    // Create timeline for this specific container
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: carouselLayout,
        start: 'center center',
        end: () => `+=${getScrollDistance() * 1.5}`, // Function-based value
        scrub: 1,
        pin: true,
        invalidateOnRefresh: true,
        pinSpacing: true,  // Explicitly set pin spacing
        onUpdate: (self) => {
          // Update progress bar width based on scroll progress
          if (progressBar) {
            gsap.set(progressBar, {
              width: `${self.progress * 100}%`
            });
          }
        }
      }
    });
    
    // Horizontal scroll animation
    tl.to(collectionList, {
      x: () => -getScrollDistance(), // Function-based value
      ease: 'none'
    });
    
    collectionItems.forEach(item => {
    });
    
  });

  // Refresh ScrollTrigger on window resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      ScrollTrigger.refresh(true); // Force refresh
    }, 250); // Debounce resize
  });
}

// Init Function
const init = () => {
  console.debug("%cRun init", "color: lightgreen;");

  setupLenis();
  swipers();
  workSectionScrollLock();
}; // end init

$(window).on("load", init);
