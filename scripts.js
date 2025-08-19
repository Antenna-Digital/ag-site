console.debug("%cScripts.js loaded", "color: lightgreen;");

// Preserve scroll position on refresh
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

let lenis;

// Lenis setup
function setupLenis() {
  lenis = new Lenis({
    // syncTouch: true,
    smoothWheel: true
  });

  // Update ScrollTrigger but prevent refresh during scroll
  lenis.on("scroll", () => {
    ScrollTrigger.update();
  });

  // Prevent Lenis from causing refreshes on pinned elements
  ScrollTrigger.addEventListener("refresh", () => {
    lenis.resize();
  });
  
  // Standard RAF without GSAP ticker to avoid conflicts
  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
}

// Global Animations
function initScrollAnimations(){
  const configs = {
    'fadeslide-up': {
      yOffset: 40,
      duration: 0.8,
      stagger: 0.15,
      animateProps: { opacity: 1, y: 0 },
      initialProps: el => ({ opacity: 0, y: 40 })
    },
    'fade': {
      duration: 0.8,
      stagger: 0.15,
      animateProps: { opacity: 1 },
      initialProps: el => ({ opacity: 0 })
    }
    // Add more animation types here as needed
  };

  const globalConfig = {
    attr: '[data-anim]', // Now selects all data-anim elements
    batchWindow: 100,
    triggerPercent: 0.90,
    get triggerPoint() { return `top ${this.triggerPercent * 100}%` }
  };

  // Track which elements have already animated
  const animatedElements = new Set();

  function getAnimConfig(el) {
    const animType = el.getAttribute('data-anim');
    return configs[animType] || configs['fadeslide-up']; // Default fallback
  }

  function handleInitialElements() {
    const scrollY = window.scrollY || window.pageYOffset;
    const triggerY = scrollY + (window.innerHeight * globalConfig.triggerPercent);
    const viewportTop = scrollY;

    const elements = gsap.utils.toArray(globalConfig.attr);
    const above = [];
    const inView = [];

    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      const elementY = rect.top + scrollY;

      if (elementY < viewportTop) {
        above.push(el);
        animatedElements.add(el);
      } else if (elementY < triggerY) {
        inView.push(el);
        animatedElements.add(el);
      }
    });

    // Instantly show elements above viewport
    above.forEach(el => {
      const config = getAnimConfig(el);
      gsap.set(el, config.animateProps);
    });

    // Group inView elements by animation type for proper staggering
    const inViewByType = {};
    inView.forEach(el => {
      const animType = el.getAttribute('data-anim');
      if (!inViewByType[animType]) inViewByType[animType] = [];
      inViewByType[animType].push(el);
    });

    // Animate each group with its own stagger
    Object.entries(inViewByType).forEach(([animType, elements]) => {
      const config = configs[animType] || configs['fadeslide-up'];
      gsap.to(elements, {
        ...config.animateProps,
        duration: config.duration,
        ease: "power3.out",
        stagger: config.stagger,
        overwrite: 'auto'
      });
    });
  }

  // Create triggers AFTER checking initial state
  setTimeout(() => {
    handleInitialElements();

    // Group queues by animation type
    const queues = {};
    const timers = {};

    function flushQueue(animType) {
      const queue = queues[animType];
      if (!queue || !queue.length) return;

      const config = configs[animType] || configs['fadeslide-up'];
      gsap.to(queue, {
        ...config.animateProps,
        duration: config.duration,
        ease: "power3.out",
        stagger: config.stagger,
        overwrite: 'auto'
      });
      queues[animType] = [];
    }

    gsap.utils.toArray(globalConfig.attr).forEach(el => {
      if (animatedElements.has(el)) return;

      const animType = el.getAttribute('data-anim');

      ScrollTrigger.create({
        trigger: el,
        start: globalConfig.triggerPoint,
        once: true,
        onEnter: () => {
          if (!animatedElements.has(el)) {
            animatedElements.add(el);

            // Initialize queue for this animation type if needed
            if (!queues[animType]) queues[animType] = [];

            queues[animType].push(el);
            clearTimeout(timers[animType]);
            timers[animType] = setTimeout(() => flushQueue(animType), globalConfig.batchWindow);
          }
        }
      });
    });
  }, 100);
};

// Swipers
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

// Work Scroll Lock Section
function workScrollLock(){
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
        end: () => `+=${getScrollDistance() * 2}`, // Function-based value
        scrub: 1,
        pin: true,
        invalidateOnRefresh: true,
        pinSpacing: true,  // Explicitly set pin spacing
        anticipatePin: 1,
        scroller: document.body,
        pinType: "transform",
        immediatePin: true,
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
};

// Compass Scroll Lock Section
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
    start: 'center center-=3%',
    end: `+=${itemCount * 100}%`, // Total scroll distance based on item count
    pin: true,
    pinSpacing: true,
    anticipatePin: 1,
    scroller: document.body,
    pinType: "transform",
    immediatePin: true,
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
};

// Work Grid Masonry
function workGridMasonry(){
  if (typeof Macy === 'undefined') {
    console.error('Macy.js not loaded');
    return;
  }
  const workGridWrap = document.querySelector('.work-grid_wrap');

  if (!workGridWrap) return;

  let macyInstance;
  let currentColumns = 0;
  
  const getBrowserFontSize = () => parseFloat(getComputedStyle(document.documentElement).fontSize);
  
  const cleanupMacyStyles = () => {
    const listElement = document.querySelector('.work-grid_collection_list');
    const items = document.querySelectorAll('.work-grid_collection_item');
    
    listElement?.removeAttribute('style');
    items.forEach(item => item.removeAttribute('style'));
  };
  
  const handleMacy = () => {
    const listElement = document.querySelector('.work-grid_collection_list');
    const container = listElement?.parentElement;
    const browserFontSize = getBrowserFontSize();
    
    // Check container query state via CSS custom property
    const computedStyle = getComputedStyle(listElement);
    const columns = computedStyle.getPropertyValue('--columns') === '2' ? 2 : 1;

    if (columns === currentColumns) {
      if (columns === 2 && macyInstance) {
        const maxItemWidth = 38 * browserFontSize;
        const minGap = 2.5 * browserFontSize;
        const listWidth = listElement.offsetWidth;
        const macyMargin = Math.max(minGap, listWidth - (maxItemWidth * 2));
        
        macyInstance.options.margin = macyMargin;
        macyInstance.recalculate(true);
      }
      return;
    }

    currentColumns = columns;

    if (macyInstance) {
      macyInstance.remove();
      macyInstance = null;
      setTimeout(cleanupMacyStyles, 0);
    }

    if (columns === 2) {
      setTimeout(() => {
        const maxItemWidth = 38 * browserFontSize;
        const minGap = 2.5 * browserFontSize;
        const listWidth = listElement.offsetWidth;
        const macyMargin = Math.max(minGap, listWidth - (maxItemWidth * 2));

        macyInstance = Macy({
          container: '.work-grid_collection_list',
          columns: 2,
          margin: macyMargin,
          waitForImages: true,
        });
        
        macyInstance.runOnImageLoad(() => {
          macyInstance.recalculate(true);
        }, true);
      }, 10);
    } else {
      setTimeout(cleanupMacyStyles, 100);
    }
  };

  // Quick recalculation for resize (no column change)
  const quickRecalc = () => {
    if (macyInstance && currentColumns === 2) {
      const listElement = document.querySelector('.work-grid_collection_list');
      const browserFontSize = getBrowserFontSize();
      const maxItemWidth = 38 * browserFontSize;
      const minGap = 2.5 * browserFontSize;
      const listWidth = listElement.offsetWidth;
      const macyMargin = Math.max(minGap, listWidth - (maxItemWidth * 2));
      
      macyInstance.options.margin = macyMargin;
      macyInstance.recalculate(true);
    }
  };

  handleMacy();

  // Finsweet CMS Load integration
  window.fsAttributes = window.fsAttributes || [];
  window.fsAttributes.push([
    'cmsload',
    (listInstances) => {
      listInstances.forEach((instance) => {
        instance.on('renderitems', () => setTimeout(handleMacy, 100));
      });
    }
  ]);

  // ResizeObserver for container query changes
  if ('ResizeObserver' in window) {
    const container = document.querySelector('.work-grid_collection_list');
    if (container && container.parentElement) {
      const resizeObserver = new ResizeObserver(() => {
        handleMacy();
      });
      resizeObserver.observe(container.parentElement);
    }
  }

  // Two-tier resize handling
  let quickTimer, fullTimer;
  window.addEventListener('resize', () => {
    // Quick recalc every 50ms during resize
    clearTimeout(quickTimer);
    quickTimer = setTimeout(quickRecalc, 50);
    
    // Full check after resize stops
    clearTimeout(fullTimer);
    fullTimer = setTimeout(handleMacy, 250);
  });
};

// Init Function
const init = () => {
  console.debug("%cRun init", "color: lightgreen;");

  setupLenis();
  swipers();
  workScrollLock();
  compassScrollLock();
  workGridMasonry();
  
  // Delay non-pinned animations slightly
  setTimeout(() => {
    initScrollAnimations();
  }, 50);
  
  // Single refresh after everything
  setTimeout(() => {
    ScrollTrigger.refresh(true);
  }, 200);
  
}; // end init

$(window).on("load", init);
