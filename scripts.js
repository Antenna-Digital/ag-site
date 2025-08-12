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

function compassScrollLock() {
  // Get elements
  const compassWrap = document.querySelector('.compass_wrap');
  const listItems = gsap.utils.toArray('.compass_content_list_item');
  const itemCount = listItems.length;
  
  // Exit if elements don't exist
  if (!compassWrap || itemCount === 0) return;
  
  // Get SVG elements for visibility toggle
  const hl1Group = document.querySelector('#hl-1');
  const hl2Group = document.querySelector('#hl-2');
  const hl3Group = document.querySelector('#hl-3');
  
  // Track current visible section
  let currentSection = 0;
  
  // Create the main ScrollTrigger
  const compassTrigger = ScrollTrigger.create({
    trigger: compassWrap,
    start: 'center center',
    end: `+=${itemCount * 100}%`, // Total scroll distance based on item count
    pin: true,
    pinSpacing: true,
    scrub: 1,
    onUpdate: (self) => {
      // Calculate which item should be active based on progress
      const progress = self.progress;
      const activeIndex = Math.floor(progress * itemCount);
      const itemProgress = (progress * itemCount) % 1; // Progress within current item (0-1)
      
      // Update active states and progress bars
      listItems.forEach((item, index) => {
        if (index < activeIndex) {
          // Completed items
          item.classList.add('is-active');
          gsap.set(item, {
            '--progress-width': '100%'
          });
        } else if (index === activeIndex) {
          // Current active item
          item.classList.add('is-active');
          gsap.set(item, {
            '--progress-width': `${itemProgress * 100}%`
          });
        } else {
          // Future items
          item.classList.remove('is-active');
          gsap.set(item, {
            '--progress-width': '0%'
          });
        }
      });
      
      // Toggle SVG group visibility based on section
      if (hl1Group && hl2Group && hl3Group && itemCount === 3) {
        const newSection = activeIndex;
        
        // Only update visibility if we're still within the scroll range
        // or going backwards into the scroll range
        if (newSection !== currentSection && progress < 1) {
          // Hide all groups first
          hl1Group.classList.add('is-hidden');
          hl2Group.classList.add('is-hidden');
          hl3Group.classList.add('is-hidden');
          
          // Show the appropriate group
          if (newSection === 0) {
            hl1Group.classList.remove('is-hidden');
          } else if (newSection === 1) {
            hl2Group.classList.remove('is-hidden');
          } else if (newSection === 2) {
            hl3Group.classList.remove('is-hidden');
          }
          
          currentSection = newSection;
        }
        
        // When at the end (progress = 1), ensure the last group stays visible
        if (progress >= 0.999) { // Using 0.999 to account for floating point precision
          hl1Group.classList.add('is-hidden');
          hl2Group.classList.add('is-hidden');
          hl3Group.classList.remove('is-hidden'); // Keep hl3 visible
        }
      }
    }
  });
  
  // Return the trigger instance for potential cleanup
  return compassTrigger;
}

// Init Function
const init = () => {
  console.debug("%cRun init", "color: lightgreen;");

  setupLenis();
  swipers();
  workSectionScrollLock();
  compassScrollLock();
}; // end init

$(window).on("load", init);
