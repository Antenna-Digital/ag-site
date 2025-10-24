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
      
      // Sort elements by their position for consistent stagger order
      elements.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
      
      elements.forEach((el, index) => {
        const customDelay = parseInt(el.getAttribute('data-anim-delay') || 0) / 1000; // Convert ms to seconds
        const staggerDelay = index * config.stagger;
        const totalDelay = staggerDelay + customDelay;
        
        gsap.to(el, {
          ...config.animateProps,
          duration: config.duration,
          ease: "power3.out",
          delay: totalDelay,
          overwrite: 'auto'
        });
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
      
      // Sort queue by position for consistent stagger
      queue.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
      
      queue.forEach((el, index) => {
        const customDelay = parseInt(el.getAttribute('data-anim-delay') || 0) / 1000; // Convert ms to seconds
        const staggerDelay = index * config.stagger;
        const totalDelay = staggerDelay + customDelay;
        
        gsap.to(el, {
          ...config.animateProps,
          duration: config.duration,
          ease: "power3.out",
          delay: totalDelay,
          overwrite: 'auto'
        });
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
    // console.log("podcast swiper(s) exists");
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

      const updateEpisodeNumber = () => {
        const activeSlide = mainSwiperEl.querySelector('.swiper-slide-active');
        const taglineStrong = wrap.querySelector('.podcast-eps_slider_tagline strong');

        if (activeSlide && taglineStrong) {
          const episodeNum = activeSlide.dataset.episodeNumber;
          if (episodeNum) {
            // Pad with leading zero if less than 10, otherwise use as-is
            const formattedNum = episodeNum.padStart(2, '0');
            taglineStrong.textContent = formattedNum;
          }
        }
      };

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

      mainSwiper.on('slideChange', updateEpisodeNumber);
      mainSwiper.on('slideChangeTransitionEnd', updateEpisodeNumber);

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

      updateEpisodeNumber();

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

  // Two-Image Slider
  if (document.querySelector(".swiper.two-image-slider_main_swiper")) {
    // console.log("two-image swiper(s) exists");
    const twoImageSwiperWraps = document.querySelectorAll(".two-image-slider_wrap");
    twoImageSwiperWraps.forEach((wrap) => {
      const mainSwiperEl = wrap.querySelector(".swiper.two-image-slider_main_swiper");
      const textSwiperEl = wrap.querySelector(
        ".swiper.two-image-slider_text_swiper"
      );
      const secondarySwiperEl = wrap.querySelector(
        ".swiper.two-image-slider_secondary_swiper"
      );
      const prevBtn = wrap.querySelector(".two-image-slider_nav_prev");
      const nextBtn = wrap.querySelector(".two-image-slider_nav_next");

      const mainSwiper = new Swiper(mainSwiperEl, {
        slidesPerView: 1,
        spaceBetween: 20,
        speed: 650,
        loop: true,
        effect: "fade",
        fadeEffect: {
          crossFade: true
        },
        // virtualTranslate: true,
        allowTouchMove: false,
        navigation: false,
      });

      const textSwiper = new Swiper(textSwiperEl, {
        slidesPerView: 1,
        spaceBetween: 20,
        speed: 500,
        speed: 700,
        loop: true,
        effect: "fade",
        fadeEffect: {
          crossFade: true
        },
        // virtualTranslate: true,
        allowTouchMove: false,
        navigation: false,
      });

      const secondarySwiper = new Swiper(secondarySwiperEl, {
        slidesPerView: 1,
        spaceBetween: 20,
        speed: 300,
        speed: 700,
        loop: true,
        effect: "fade",
        fadeEffect: {
          crossFade: true
        },
        // virtualTranslate: true,
        allowTouchMove: false,
        navigation: false,
      });

      let isAnimating = false;
      const delay = 750;

      prevBtn.addEventListener("click", () => {
        if (!isAnimating) {
          isAnimating = true;
          mainSwiper.slidePrev();
          textSwiper.slidePrev();
          secondarySwiper.slidePrev();
          setTimeout(() => {
            isAnimating = false;
          }, delay);
        }
      });

      nextBtn.addEventListener("click", () => {
        if (!isAnimating) {
          isAnimating = true;
          mainSwiper.slideNext();
          textSwiper.slideNext();
          secondarySwiper.slideNext();
          setTimeout(() => {
            isAnimating = false;
          }, delay);
        }
      });
    });
  }
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
  
  // Store animation states before cleanup
  const preserveAnimationStates = () => {
    const items = document.querySelectorAll('.work-grid_collection_item');
    const states = new Map();
    
    items.forEach(item => {
      const animEl = item.querySelector('[data-anim]') || item;
      if (animEl) {
        const computed = getComputedStyle(animEl);
        // Check if element has been animated (opacity > 0)
        if (computed.opacity !== '0') {
          states.set(animEl, {
            opacity: computed.opacity,
            transform: computed.transform
          });
        }
      }
    });
    
    return states;
  };
  
  // Restore animation states after cleanup
  const restoreAnimationStates = (states) => {
    if (!states || states.size === 0) return;
    
    states.forEach((style, el) => {
      if (el && document.contains(el)) {
        gsap.set(el, {
          opacity: style.opacity,
          clearProps: 'transform', // Clear transform to let Macy handle positioning
          immediateRender: true,
          overwrite: 'auto'
        });
      }
    });
  };
  
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

    // Preserve animation states before destroying Macy
    const animationStates = preserveAnimationStates();

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
          // Restore animation states after Macy is done
          restoreAnimationStates(animationStates);
        }, true);
      }, 10);
    } else {
      setTimeout(() => {
        cleanupMacyStyles();
        // Restore animation states after cleanup
        restoreAnimationStates(animationStates);
      }, 100);
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

// Accordion Section
function accordionSection(){
  const accordionComponents = document.querySelectorAll('.accordion-section_wrap');
  if (!accordionComponents.length) return;

  class Accordion {
    constructor(wrapper) {
      this.wrapper = wrapper;
      this.items = wrapper.querySelectorAll('[data-accordion-item]');
      this.activeItem = null;
      this.animating = false;
      this.init();
    }
  
    init() {
      this.items.forEach((item, index) => {
        const inner = item.querySelector('.accordion-section_accordion_item_inner');
        const textElement = item.querySelector('.accordion-section_accordion_item_text');
        const paragraph = textElement ? textElement.querySelector('.c-paragraph') : null;
        
        if (!inner || !textElement) {
          console.error('Missing required elements in accordion item', index);
          return;
        }
        
        // Store references
        item.accordionInner = inner;
        item.accordionContent = textElement;
        item.accordionParagraph = paragraph;
        
        // Set initial state
        if (index === 0) {
          // First item is open
          item.classList.add('is-active');
          this.activeItem = item;
          // Store the natural height for later use
          item.naturalHeight = textElement.offsetHeight;
          gsap.set(textElement, { height: 'auto', overflow: 'hidden' });
        } else {
          // Others are closed
          gsap.set(textElement, { height: 0, overflow: 'hidden' });
          // Store natural height for animation
          gsap.set(textElement, { height: 'auto' });
          item.naturalHeight = textElement.offsetHeight;
          gsap.set(textElement, { height: 0 });
        }
        
        // Add click handler
        inner.style.cursor = 'pointer';
        inner.addEventListener('click', (e) => {
          e.preventDefault();
          if (!this.animating) {
            this.toggleItem(item);
          }
        });
      });
    }
  
    toggleItem(clickedItem) {
      if (this.animating) return;
      this.animating = true;
      
      // Create a timeline for simultaneous animations
      const tl = gsap.timeline({
        onComplete: () => {
          this.animating = false;
          // Set the opened item to auto height for responsiveness
          if (this.activeItem) {
            gsap.set(this.activeItem.accordionContent, { height: 'auto' });
          }
        }
      });
      
      if (this.activeItem === clickedItem) {
        // Just close the current item
        this.addCloseAnimation(tl, clickedItem, 0);
        clickedItem.classList.remove('is-active');
        this.activeItem = null;
      } else {
        // If there's an active item, close it
        if (this.activeItem) {
          this.addCloseAnimation(tl, this.activeItem, 0);
          this.activeItem.classList.remove('is-active');
        }
        
        // Open the clicked item at the same time
        this.addOpenAnimation(tl, clickedItem, 0);
        clickedItem.classList.add('is-active');
        this.activeItem = clickedItem;
      }
      
      tl.play();
    }
    
    addOpenAnimation(timeline, item, position) {
      const textElement = item.accordionContent;
      const paragraph = item.accordionParagraph;
      
      // Get fresh height measurement
      gsap.set(textElement, { height: 'auto' });
      const targetHeight = textElement.offsetHeight;
      gsap.set(textElement, { height: 0 });
      
      // Animate height
      timeline.to(textElement, {
        height: targetHeight,
        duration: 0.4,
        ease: 'power2.inOut'
      }, position);
      
      // Fade in content (no y movement)
      if (paragraph) {
        timeline.from(paragraph, {
          opacity: 0,
          duration: 0.3,
          ease: 'power2.out'
        }, position + 0.1); // Slight delay for better effect
      }
    }
    
    addCloseAnimation(timeline, item, position) {
      const textElement = item.accordionContent;
      
      // Get current height before animating
      const currentHeight = textElement.offsetHeight;
      gsap.set(textElement, { height: currentHeight });
      
      // Animate to closed
      timeline.to(textElement, {
        height: 0,
        duration: 0.4,
        ease: 'power2.inOut'
      }, position);
    }
  }

  // Create an accordion instance for each wrapper
  accordionComponents.forEach(wrapper => {
    new Accordion(wrapper);
  });
}

// Timeline Accordion
function timelineAccordion() {
  document.querySelectorAll('.timeline-accordion_accordion_item').forEach(item => {
    const header = item.querySelector('.timeline-accordion_accordion_header');
    const body = item.querySelector('.timeline-accordion_accordion_body');
    
    // Set initial state
    gsap.set(body, { height: 0, paddingBottom: 0, overflow: 'hidden' });
    item.dataset.isOpen = 'false';
    
    // Add click listener to header
    header?.addEventListener('click', () => {
      const isOpen = item.dataset.isOpen === 'true';
      
      if (!isOpen) {
        gsap.fromTo(body, {
          height: 0,
          paddingBottom: 0
        }, {
          height: 'auto',
          paddingBottom: '1rem',
          duration: 0.5,
          ease: 'power2.inOut'
        });
        item.dataset.isOpen = 'true';
      } else {
        gsap.to(body, {
          height: 0,
          paddingBottom: 0,
          duration: 0.4,
          ease: 'power2.inOut'
        });
        item.dataset.isOpen = 'false';
      }
    });
  });
}

// Odometers
function odometers() {
  const statSections = document.querySelectorAll(".stat-grid_wrap");
  if (statSections.length) {
    statSections.forEach((section) => {
      const statValues = section.querySelectorAll(".stat-grid_item_value");
      const statInit = function (statValues) {
        statValues.forEach(function (statVal, index) {
          const originalValue = statVal.innerHTML.trim();
          if (originalValue !== "") {
            const [integerPart, decimalPart] = originalValue.split(".");
            const zeroIntegerPart = integerPart.replace(/\d/g, "0"); // Convert integer part to zeroes while preserving commas
            const formattedZeroValue =
              decimalPart !== undefined
                ? `${zeroIntegerPart}.${"0".repeat(decimalPart.length)}`
                : zeroIntegerPart; // Preserve decimal places if present

            statVal.innerHTML = formattedZeroValue; // Start from the correct number of digits
            // console.log(
            //   `Original: ${originalValue}, Zeroed: ${formattedZeroValue}`
            // );

            var od = new Odometer({
              el: statVal,
              format: "(,ddd).dd",
              value: formattedZeroValue,
              duration: 3000,
            });
            var delay = index * 0.15;
            gsap.to(statVal, {
              ease: "none",
              scrollTrigger: {
                trigger: statVal,
                start: "top 90%",
                invalidateOnRefresh: !0,
                scrub: 0,
                onEnter: function onEnter() {
                  gsap.delayedCall(delay, function () {
                    od.update(originalValue);
                  });
                },
              },
            });
          }
        });
      };
      statInit(statValues);
    });
  }
}

// Marquees
function marquees() {
  // Enhanced Marquee Controller
  // Progressive enhancement for CSS-only marquee
  // Uses data attributes for structure-agnostic implementation
  class MarqueeController {
    constructor(element, options = {}) {
      this.element = element;
      
      // Read configuration from data attributes or options
      this.options = {
        pixelsPerSecond: this.getConfig('speed', 50),
        pauseOnHover: this.getConfig('pauseOnHover', true),
        fadeEdges: this.getConfig('fade', true),
        smooth: this.getConfig('smooth', true),
        observeResize: true,
        ...options
      };
      
      this.isPaused = false;
      this.isReversed = false;
      this.resizeObserver = null;
      this.mutationObserver = null;
      
      this.init();
    }
    
    getConfig(attr, defaultValue) {
      // Check multiple sources for configuration
      // 1. Data attribute (e.g., data-marquee-speed)
      const attrName = `marquee${attr.charAt(0).toUpperCase() + attr.slice(1)}`;
      const dataAttr = this.element.dataset[attrName];
      
      if (dataAttr !== undefined) {
        // Handle boolean values
        if (dataAttr === 'true') return true;
        if (dataAttr === 'false') return false;
        // Return other values as-is
        return dataAttr;
      }
      
      // 2. CSS variable (e.g., --marquee-pixels-per-second)
      if (attr === 'speed') {
        const cssVar = getComputedStyle(this.element).getPropertyValue('--marquee-pixels-per-second');
        if (cssVar) {
          return parseFloat(cssVar);
        }
      }
      
      // 3. Inline style variable
      const inlineStyle = this.element.style.getPropertyValue(`--marquee-${attr}`);
      if (inlineStyle) {
        return inlineStyle;
      }
      
      return defaultValue;
    }
    
    init() {
      // Add loading state
      this.element.dataset.marqueeLoading = 'true';
      
      // Wait for content to load
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.setup());
      } else {
        this.setup();
      }
    }
    
    setup() {
      // Get elements using data attributes
      this.wrapper = this.element.querySelector('[data-marquee-inner]');
      this.contents = this.element.querySelectorAll('[data-marquee-content]');
      
      if (!this.wrapper || !this.contents.length) {
        console.warn('Marquee: Required elements not found');
        return;
      }
      
      // Calculate and set optimal animation duration
      this.calculateDuration();
      
      // Apply enhancements
      this.element.dataset.marqueeEnhanced = 'true';
      
      // Set initial data attributes based on options using setAttribute
      this.element.setAttribute('data-marquee-pause-on-hover', this.options.pauseOnHover ? 'true' : 'false');
      this.element.setAttribute('data-marquee-fade', this.options.fadeEdges ? 'true' : 'false');
      this.element.setAttribute('data-marquee-smooth', this.options.smooth ? 'true' : 'false');
      
      // Set up observers
      if (this.options.observeResize) {
        this.observeSize();
      }
      
      // Watch for content changes
      this.observeContent();
      
      // Remove loading state
      delete this.element.dataset.marqueeLoading;
      this.element.dataset.marqueeLoaded = 'true';
      
      // Ensure smooth start
      this.syncAnimations();
    }
    
    calculateDuration() {
      const firstContent = this.contents[0];
      if (!firstContent) return;
      
      // Force a layout recalculation to get accurate measurements
      firstContent.style.display = 'none';
      firstContent.offsetHeight; // Trigger reflow
      firstContent.style.display = '';
      
      // Get computed styles for accurate gap calculation
      const computedStyle = window.getComputedStyle(this.element);
      const gapValue = computedStyle.getPropertyValue('--marquee-gap').trim();
      
      // Parse the gap value properly (handles clamp, rem, px, etc.)
      let gap = 0;
      const tempEl = document.createElement('div');
      tempEl.style.width = gapValue;
      tempEl.style.position = 'absolute';
      tempEl.style.visibility = 'hidden';
      document.body.appendChild(tempEl);
      gap = tempEl.getBoundingClientRect().width;
      document.body.removeChild(tempEl);
      
      // Get the inner content wrapper for accurate width
      const innerContent = firstContent.querySelector('[data-marquee-items]');
      if (!innerContent) return;
      
      // Calculate the actual content width
      const contentWidth = innerContent.scrollWidth;
      const totalWidth = contentWidth + gap;
      
      // Get the current pixels per second value (may have been updated)
      const currentSpeed = parseFloat(this.getConfig('speed', this.options.pixelsPerSecond));
      
      // Calculate duration based on desired speed
      const duration = totalWidth / currentSpeed;
      
      // Set CSS variable for animation duration
      this.element.style.setProperty('--marquee-duration', `${duration}s`);
      
      // Store for later use
      this.duration = duration;
      this.contentWidth = totalWidth;
    }
    
    syncAnimations() {
      // Ensure all duplicate content animations are synchronized
      this.contents.forEach((content) => {
        // Reset animation
        content.style.animation = 'none';
        // Remove any inline animation-play-state that might interfere
        content.style.animationPlayState = '';
        content.offsetHeight; // Trigger reflow
        
        // Start all animations at the same time
        const animationName = 'marqueeScroll';
        const duration = `var(--marquee-duration, ${this.duration}s)`;
        const timing = 'linear';
        const iterations = 'infinite';
        const direction = this.isReversed ? 'reverse' : 'normal';
        
        content.style.animation = `${animationName} ${duration} ${timing} ${iterations} ${direction}`;
        
        // Only apply inline play state if explicitly paused
        if (this.isPaused) {
          content.style.animationPlayState = 'paused';
        }
      });
    }
    
    updateOptions(newOptions) {
      Object.assign(this.options, newOptions);
      
      // Update CSS variables and data attributes
      if (newOptions.pixelsPerSecond !== undefined) {
        this.element.dataset.marqueeSpeed = newOptions.pixelsPerSecond;
        this.element.style.setProperty('--marquee-pixels-per-second', newOptions.pixelsPerSecond);
        this.calculateDuration();
        this.syncAnimations();
      }
      
      // Update pause on hover - use setAttribute for reliability
      if (newOptions.pauseOnHover !== undefined) {
        const value = newOptions.pauseOnHover ? 'true' : 'false';
        this.element.setAttribute('data-marquee-pause-on-hover', value);
        // Also update the options to keep in sync
        this.options.pauseOnHover = newOptions.pauseOnHover;
      }
      
      // Update fade edges - use setAttribute for reliability
      if (newOptions.fadeEdges !== undefined) {
        this.element.setAttribute('data-marquee-fade', newOptions.fadeEdges ? 'true' : 'false');
      }
      
      // Update smooth transitions
      if (newOptions.smooth !== undefined) {
        this.element.setAttribute('data-marquee-smooth', newOptions.smooth ? 'true' : 'false');
      }
    }
    
    play() {
      this.isPaused = false;
      this.element.dataset.marqueePaused = 'false';
      this.contents.forEach(content => {
        // Remove inline style to allow CSS hover to work
        content.style.animationPlayState = '';
      });
    }
    
    pause() {
      this.isPaused = true;
      this.element.dataset.marqueePaused = 'true';
      this.contents.forEach(content => {
        content.style.animationPlayState = 'paused';
      });
    }
    
    reverse() {
      this.isReversed = !this.isReversed;
      this.element.dataset.marqueeDirection = this.isReversed ? 'reverse' : 'normal';
      this.syncAnimations();
    }
    
    reset() {
      this.isReversed = false;
      this.isPaused = false;
      this.element.dataset.marqueePaused = 'false';
      this.element.dataset.marqueeDirection = 'normal';
      this.calculateDuration();
      this.syncAnimations();
    }
    
    observeSize() {
      // Recalculate on resize
      this.resizeObserver = new ResizeObserver(() => {
        this.calculateDuration();
        this.syncAnimations();
      });
      
      this.resizeObserver.observe(this.element);
      this.resizeObserver.observe(this.contents[0]);
    }
    
    observeContent() {
      // Watch for content changes
      this.mutationObserver = new MutationObserver(() => {
        this.calculateDuration();
        this.syncAnimations();
      });
      
      this.mutationObserver.observe(this.contents[0], {
        childList: true,
        subtree: true
      });
    }
    
    destroy() {
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
      }
      if (this.mutationObserver) {
        this.mutationObserver.disconnect();
      }
      delete this.element.dataset.marqueeEnhanced;
      delete this.element.dataset.marqueeLoaded;
      this.element.style.removeProperty('--marquee-duration');
    }
  }
  
  // Auto-initialize all marquees
  const marquees = document.querySelectorAll('[data-marquee]');
  const controllers = [];
  
  marquees.forEach(element => {
    // The controller will read configuration from data attributes and CSS variables
    const controller = new MarqueeController(element);
    controllers.push(controller);
  });
}

// Form Stuff
function formStuff() {
  // Listen to all jQuery AJAX events (success, error, etc.)
  $(document).ajaxComplete(function (event, xhr, settings) {
    if (settings.url.includes('/form/')) {
      // console.log('AJAX completed:', event, xhr, settings);

      if (xhr.status === 200) {
        console.log('Form successfully submitted');
        ScrollTrigger.refresh();
      } else {
        console.log('Form submission failed');
      }
    }
  });

  // HubSpot forms fire global events we can hook into
  window.addEventListener('message', function(event) {
    // HubSpot forms post messages from their iframe
    if (event.data.type === 'hsFormCallback' && event.data.eventName === 'onFormSubmitted') {
      // console.log('HubSpot form submitted:', event.data);
      
      // Delay refresh slightly to ensure DOM updates are complete
      setTimeout(() => {
        ScrollTrigger.refresh();
        // console.log('ScrollTrigger refreshed after form submission');
      }, 100);
    }
  });
  
  // Alternative: If using HubSpot's embed code directly (not iframe)
  window.HubSpotConversations?.on?.('conversationStarted', function() {
    ScrollTrigger.refresh();
  });


  // Compass Form
  const form = document.getElementById('assessment-form');
  
  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Get all select elements within the form
      const selects = form.querySelectorAll('select');
      
      // Check if all selects have "yes" as their value
      let allYes = true;
      
      for (let select of selects) {
        if (select.value.toLowerCase() !== 'yes') {
          allYes = false;
          break;
        }
      }
      
      // Redirect based on the result
      if (allYes) {
        window.open('https://fullyconscious.com/self-assessment', '_blank');
      } else {
        window.open('https://fullyconscious.com/self-assessment?contact=true', '_blank');
      }
    });
  }
}

// Expertise Stack Section
function expertiseStackNav() {
  const stackItems = document.querySelectorAll('.expertise-stack_item');
  const navContainer = document.querySelector('.expertise-stack_nav');
  
  if (!stackItems.length || !navContainer) return;
  
  // Store ScrollTrigger instances
  const triggers = [];
  
  // Generate nav items dynamically
  stackItems.forEach((item, index) => {
    item.id = `expertise-item-${index}`;
    
    // Use button instead of anchor to avoid URL hash
    const navItem = document.createElement('button');
    navItem.className = 'expertise-stack_nav_item';
    navItem.setAttribute('data-index', index);
    navItem.setAttribute('aria-label', `Go to section ${index + 1}`);
    navItem.innerHTML = '<span></span>';
    
    navContainer.appendChild(navItem);
  });
  
  const navItems = document.querySelectorAll('.expertise-stack_nav_item');
  
  // Function to check and update active state based on scroll position
  const updateActiveState = () => {
    const threshold = window.innerHeight * 0.05; // 5% of viewport
    let activeIndex = -1;
    
    // Find the last item that has its top at or above the threshold
    stackItems.forEach((item, index) => {
      const rect = item.getBoundingClientRect();
      // If item's top is at or above the threshold zone, it could be the active one
      if (rect.top <= threshold) {
        activeIndex = index;
      }
    });
    
    // Update all nav items - only one should be active
    navItems.forEach((nav, index) => {
      nav.classList.toggle('is-active', index === activeIndex);
    });
  };
  
  // Create ScrollTriggers (keep for reference positions)
  stackItems.forEach((item, index) => {
    const trigger = ScrollTrigger.create({
      trigger: item,
      start: "top top",
      end: "bottom top",
      pin: false
    });
    
    triggers.push(trigger);
  });
  
  // Click navigation
  navItems.forEach((navItem, clickIndex) => {
    navItem.addEventListener('click', (e) => {
      e.preventDefault();
      
      if (window.lenis) {
        window.lenis.stop();
      }
      
      const trigger = triggers[clickIndex];
      if (!trigger) return;
      
      const targetPosition = trigger.start + 1;
      
      if (window.lenis) {
        window.lenis.scrollTo(targetPosition, {
          duration: 1.2,
          immediate: false,
          force: true,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
        });
      } else {
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
  
  // Listen to scroll events to update active state
  window.addEventListener('scroll', updateActiveState, { passive: true });
  
  // Initial check
  updateActiveState();
  
  // Refresh ScrollTrigger positions on resize
  window.addEventListener('resize', () => {
    ScrollTrigger.refresh();
    updateActiveState();
  });
}

// Hero Vanta BG
function heroVantaBG() {
  // Theme configurations
  const VANTA_THEMES = {
    'blue-white': {
      highlightColor: 0xb9c5cc,
      midtoneColor: 0xdee7e8,
      lowlightColor: 0xfcfcfc,
      baseColor: 0xf2f2f2,
      blurFactor: 0.90,
      speed: 1.80,
      zoom: 0.5
    },
    'red-orange': {
      highlightColor: 0xd46a35,
      midtoneColor: 0xe2e65a,
      lowlightColor: 0xd4e3ef,
      baseColor: 0xbfcdd9,
      blurFactor: 0.9,
      speed: 1.80,
      zoom: 0.6
    }
  };
  
  // Change this to select your desired theme
  const SELECTED_THEME = 'blue-white'; // or 'red-orange'
  
  let vantaEffect = null;
  
  // Initialize Vanta effect
  function initVanta() {
    const container = document.getElementById('vanta-bg');
    
    if (!container) {
      console.warn('Vanta container not found');
      return;
    }
    
    try {
      vantaEffect = VANTA.FOG({
        el: container,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.00,
        minWidth: 200.00,
        scale: 1.00,
        scaleMobile: 1.00,
        ...VANTA_THEMES[SELECTED_THEME]
      });
      
    } catch (error) {
      console.error('Failed to initialize Vanta:', error);
    }
  }
  
  // Handle window resize
  function handleResize() {
    if (vantaEffect) {
      vantaEffect.resize();
    }
  }
  
  // Initialize effect
  initVanta();
  
  // Add resize listener with debouncing
  let resizeTimeout;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(handleResize, 250);
  });
  
  // Cleanup on page unload
  // window.addEventListener('beforeunload', function() {
  //   if (vantaEffect) {
  //     vantaEffect.destroy();
  //   }
  // });
};

// Finsweet Stuff
// https://finsweet.com/attributes/attributes-api
function finsweetStuff() {
  console.debug(
    "%c [DEBUG] Starting finsweetStuff",
    "background: #33cc33; color: white"
  );

  window.FinsweetAttributes ||= [];
  window.FinsweetAttributes.push([
    'list',
    (listInstances) => {
      listInstances.forEach((list)=>{
        list.addHook("afterRender", (items) => {
          ScrollTrigger.refresh();
          lenis.resize();
          // initScrollAnimations();
          initGsapAnimations();
          window.scrollBy(0, 1);
          setTimeout(() => {
            window.scrollBy(0, -1);
          }, 0);
        })
      });

      /* Log all stages of lifecycle */
      /*
      const phases = [
        'start',
        'filter',
        'sort',
        'pagination',
        'beforeRender',
        'render',
        'afterRender'
      ];
      listInstances.forEach((list) => {
        phases.forEach((phase) => {
          list.addHook(phase, (items) => {
            console.log(`[fs-list] Phase: ${phase}`, {
              listInstance: list,
              itemCount: items.length,
              items
            });
            return items;
          });
        });
      });
      */
    }
  ]);
}

// Global GSAP Variables
let headingYPercent = 150;
let paragraphYPercent = 150;
let buttonsYPercent = 150;
let defaultStagger = 0.1;
let defaultPosition = ">-0.25";
let defaultEasingIn = 'power3.in';
let defaultEasingOut = 'power3.out';
let defaultEasingInOut = 'power3.inOut';

//-----------------//
/* GSAP Animations */
//-----------------//
function initGsapAnimations() {
  workScrollLock();
  compassScrollLock();
  splitScrollLock();
  document.fonts.ready.then(() => {
    navComponent();
    homepageHeroComponent();
    innerHeroBasicComponent();
    innerHeroStyledComponent();
    headingWithImagesComponent();
    workScrollLockComponent();
    showreelComponent();
    ourExpertiseComponent();
    logoCarouselComponent();
    consciousCompassComponent();
    podcastEpisodesSliderComponent();
    aboveFooterCTAComponent();
    splitScrollLockComponent();
    footerComponent();
    setTimeout(compassTeaserComponent, 200);
    setTimeout(fitAssessmentComponent, 200);
  });

  // Refresh after all animations registered
  ScrollTrigger.refresh();
};

// Helper function
// ---------------
// Trigger when top of container hits 80% from top of viewport
// shouldSkipAnimation(container, 'top 80%')
// ---------------
// Trigger when bottom of container hits 10% from top of viewport
// shouldSkipAnimation(container, 'bottom 10%')
// ---------------
// Trigger when top of container hits center
// shouldSkipAnimation(container, 'top 50%')
// ---------------
function shouldSkipAnimation(container, startPosition = 'bottom 20%') {
  const scrollY = window.scrollY || window.pageYOffset;
  const viewportHeight = window.innerHeight;
  const rect = container.getBoundingClientRect();
  
  // Parse the start position
  const [edge, percentString] = startPosition.split(' ');
  const percent = parseFloat(percentString) / 100;
  
  let triggerY;
  
  if (edge === 'top') {
    // Top of element relative to viewport percentage from top
    triggerY = rect.top + scrollY;
  } else if (edge === 'bottom') {
    // Bottom of element relative to viewport percentage from top
    triggerY = rect.bottom + scrollY;
  } else {
    // Fallback to top if unrecognized
    triggerY = rect.top + scrollY;
  }
  
  const triggerActivationY = scrollY + (viewportHeight * percent);
  
  return triggerY < triggerActivationY;
}

// Work Scroll Lock Component
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
        scrub: true,
        pin: true,
        invalidateOnRefresh: true,
        pinSpacing: true,  // Explicitly set pin spacing
        // anticipatePin: 1,
        // scroller: document.body,
        // pinType: "transform",
        pinType: "fixed",
        // immediatePin: true,
        onUpdate: (self) => {
          // Update progress bar width based on scroll progress
          if (progressBar) {
            // Adjust progress to account for padding
            const adjustedProgress = Math.max(0, Math.min(1, (self.progress - 0.1) / 0.8));
            gsap.set(progressBar, {
              width: `${adjustedProgress * 100}%`
            });
          }
        }
      }
    });
    
    // Add padding before animation starts (10% of timeline)
    tl.to({}, { duration: 0.1 });
    
    // Horizontal scroll animation (80% of timeline)
    tl.to(collectionList, {
      x: () => -getScrollDistance(),
      ease: 'none',
      duration: 0.8
    });
    
    // Add padding after animation ends (10% of timeline)
    tl.to({}, { duration: 0.1 });
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

// Compass Scroll Lock Component with SVG Chart
function compassScrollLock() {
  // Chart data states for different scroll positions
  const chartStates = [
    // State 1: Complete the assessment
    [20, 45, 55, 10, 70, 25, 50, 45],
    // State 2: Get your score
    [45, 20, 45, 55, 10, 70, 25, 50],
    // State 3: View detailed feedback
    [50, 45, 20, 45, 55, 10, 70, 25]
  ];

  // Chart configuration
  const chartConfig = {
    labels: ['Awake', 'Aware', 'Reflective', 'Attentive', 'Cogent', 'Sentient', 'Visionary', 'Intentional'],
    centerX: 226,
    centerY: 226,
    maxRadius: 225
  };

  // Get elements
  const compassWrap = document.querySelector('.compass_wrap');
  const listItems = gsap.utils.toArray('.compass_content_list_item');
  const itemCount = listItems.length;
  
  // Exit if elements don't exist
  if (!compassWrap || itemCount === 0) return;

  // Create or get the SVG chart
  let chartContainer = document.querySelector('.compass_graphic_wrap');
  if (!chartContainer) {
    console.error('Chart container not found');
    return;
  }

  // Replace canvas with SVG if needed
  if (chartContainer.tagName === 'CANVAS') {
    const svgContainer = document.createElement('div');
    svgContainer.className = chartContainer.className;
    chartContainer.parentNode.replaceChild(svgContainer, chartContainer);
    chartContainer = svgContainer;
  }

  // Create the SVG structure
  chartContainer.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="-100 -50 652 552" style="width: 100%; height: 100%;">
      <!-- Background rings -->
      <g class="chart-rings">
        <path d="M226 1L66.901 66.901L1 226L66.901 385.099L226 451L385.099 385.099L451 226L385.099 66.901L226 1Z" 
              fill="#f7f6f4" stroke="none" opacity="0.8"/>
        <path d="M226 57.25L106.676 106.676L57.25 226L106.676 345.324L226 394.75L345.324 345.324L394.75 226L345.324 106.676L226 57.25Z" 
              fill="#e1dfda" stroke="none" opacity="0.8"/>
        <path d="M226 113.5L146.451 146.451L113.5 226L146.451 305.549L226 338.5L305.549 305.549L338.5 226L305.549 146.451L226 113.5Z" 
              fill="#f7f6f4" stroke="none" opacity="0.8"/>
        <path d="M226 169.75L186.225 186.225L169.75 226L186.225 265.775L206.113 274.012L226 282.25L265.775 265.775L282.25 226L265.775 186.225L226 169.75Z" 
              fill="#e1dfda" stroke="none" opacity="0.8"/>
      </g>
      
      <!-- Data shape -->
      <polygon class="data-shape" 
               points="" 
               fill="rgba(222, 228, 46, 0.7)" 
               stroke="#DEE42E" 
               stroke-width="2"/>
      
      <!-- Data points -->
      <g class="data-points"></g>
      
      <!-- Grid lines -->
      <g class="grid-lines">
        <path d="M226 169.75L186.225 186.225L169.75 226L186.225 265.775L206.113 274.012L226 282.25L265.775 265.775L282.25 226L265.775 186.225L226 169.75ZM226 113.5L146.451 146.451L113.5 226L146.451 305.549L226 338.5L305.549 305.549L338.5 226L305.549 146.451L226 113.5ZM226 57.25L106.676 106.676L57.25 226L106.676 345.324L226 394.75L345.324 345.324L394.75 226L345.324 106.676L226 57.25ZM226 1L66.901 66.901L1 226L66.901 385.099L226 451L385.099 385.099L451 226L385.099 66.901L226 1Z" 
              stroke="#11171E" stroke-width="1.5" fill="none" opacity="0.9"/>
      </g>
      
      <!-- Center lines -->
      <g class="center-lines"></g>
      
      <!-- Labels -->
      <g class="chart-labels"></g>
    </svg>
  `;

  // Get SVG elements
  const svg = chartContainer.querySelector('svg');
  const dataShape = svg.querySelector('.data-shape');
  const dataPointsGroup = svg.querySelector('.data-points');
  const centerLinesGroup = svg.querySelector('.center-lines');
  const labelsGroup = svg.querySelector('.chart-labels');

  // Function to calculate data points
  function calculateDataPoints(data) {
    return data.map((value, index) => {
      const normalizedValue = (value / 100) * chartConfig.maxRadius;
      const angle = (index * 2 * Math.PI / data.length) - Math.PI / 2;
      const x = chartConfig.centerX + normalizedValue * Math.cos(angle);
      const y = chartConfig.centerY + normalizedValue * Math.sin(angle);
      return { x, y, value };
    });
  }

  // Function to calculate label positions
  function calculateLabelPosition(index, total, radius) {
    const angle = (index * 2 * Math.PI / total) - Math.PI / 2;
    const isCardinal = index % 2 === 0;
    const actualRadius = isCardinal ? 235 : radius;
    const x = chartConfig.centerX + actualRadius * Math.cos(angle);
    const y = chartConfig.centerY + actualRadius * Math.sin(angle);
    
    let textAnchor = "middle";
    let dy = "0";
    
    if (!isCardinal) {
      if (Math.cos(angle) < 0) {
        textAnchor = "end";
        return { x: x + 10, y, textAnchor, dy };
      }
      if (Math.cos(angle) > 0) {
        textAnchor = "start";
        return { x: x - 10, y, textAnchor, dy };
      }
    }
    
    if (Math.abs(Math.cos(angle)) > 0.85) {
      textAnchor = Math.cos(angle) > 0 ? "start" : "end";
    }
    if (Math.abs(Math.sin(angle)) > 0.85) {
      dy = Math.sin(angle) > 0 ? "1em" : "-0.5em";
    }

    return { x, y, textAnchor, dy };
  }

  // Initialize center lines
  chartConfig.labels.forEach((_, index) => {
    const angle = (index * 2 * Math.PI / chartConfig.labels.length) - Math.PI / 2;
    const endX = chartConfig.centerX + chartConfig.maxRadius * Math.cos(angle);
    const endY = chartConfig.centerY + chartConfig.maxRadius * Math.sin(angle);
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', chartConfig.centerX);
    line.setAttribute('y1', chartConfig.centerY);
    line.setAttribute('x2', endX);
    line.setAttribute('y2', endY);
    line.setAttribute('stroke', '#11171E');
    line.setAttribute('stroke-opacity', '0.1');
    line.setAttribute('stroke-width', '1.5');
    centerLinesGroup.appendChild(line);
  });

  // Initialize labels
  chartConfig.labels.forEach((label, index) => {
    const pos = calculateLabelPosition(index, chartConfig.labels.length, 260);
    
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', pos.x);
    text.setAttribute('y', pos.y);
    text.setAttribute('text-anchor', pos.textAnchor);
    text.setAttribute('dy', pos.dy);
    text.setAttribute('fill', '#11171E');
    text.style.fontSize = '16px';
    text.style.fontFamily = '"Restarthard 2", Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    text.textContent = label;
    labelsGroup.appendChild(text);
  });

  // Function to update chart
  function updateChart(data, progress = 1) {
    const points = calculateDataPoints(data);
    const pointsString = points.map(p => `${p.x},${p.y}`).join(' ');
    
    // Animate polygon points
    gsap.to(dataShape, {
      attr: { points: pointsString },
      duration: 0.5,
      ease: 'ease'
    });
    
    // Update or create data points
    const existingPoints = dataPointsGroup.querySelectorAll('circle');
    
    points.forEach((point, index) => {
      let circle = existingPoints[index];
      
      if (!circle) {
        circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('r', '4');
        circle.setAttribute('fill', '#DEE42E');
        circle.setAttribute('stroke', '#DEE42E');
        circle.setAttribute('stroke-width', '1');
        dataPointsGroup.appendChild(circle);
      }
      
      gsap.to(circle, {
        attr: { cx: point.x, cy: point.y },
        duration: 0.5,
        ease: 'ease'
      });
    });
  }

  // Function to interpolate between data states
  function interpolateData(data1, data2, progress) {
    return data1.map((val, i) => val + (data2[i] - val) * progress);
  }

  let currentSection = 0;
  
  // Initialize with first state
  updateChart(chartStates[0]);
  
  // Create the main ScrollTrigger
  const compassTrigger = ScrollTrigger.create({
    trigger: compassWrap,
    start: 'center center-=3%',
    end: `+=${itemCount * 100}%`,
    pin: true,
    pinSpacing: true,
    // anticipatePin: 1,
    scroller: document.body,
    // pinType: "transform",
    pinType: "fixed",
    // immediatePin: true,
    scrub: true,
    onUpdate: (self) => {
      const progress = self.progress;
      const activeIndex = Math.floor(progress * itemCount);
      const itemProgress = (progress * itemCount) % 1;
  
      // Get text elements
      const textElements = gsap.utils.toArray('.compass_content_text');
      
      // Update list items
      listItems.forEach((item, index) => {
        if (index < activeIndex) {
          item.classList.add('is-active');
          gsap.set(item, { '--progress-width': '100%' });
        } else if (index === activeIndex) {
          item.classList.add('is-active');
          gsap.set(item, { '--progress-width': `${itemProgress * 100}%` });
        } else {
          item.classList.remove('is-active');
          gsap.set(item, { '--progress-width': '0%' });
        }
      });
  
      // Update text elements - only the current one is active
      textElements.forEach((text, index) => {
        if (index === activeIndex || (progress >= 1 && index === textElements.length - 1)) {
          text.classList.add('is-active');
        } else {
          text.classList.remove('is-active');
        }
      });
      
      // Update chart based on scroll
      const sectionIndex = Math.min(activeIndex, chartStates.length - 1);
      
      if (sectionIndex !== currentSection || (itemProgress > 0 && sectionIndex < chartStates.length - 1)) {
        let dataToShow;
        
        // Interpolate between states for smooth transitions
        if (itemProgress > 0 && sectionIndex < chartStates.length - 1) {
          dataToShow = interpolateData(
            chartStates[sectionIndex],
            chartStates[sectionIndex + 1],
            itemProgress
          );
        } else {
          dataToShow = chartStates[sectionIndex];
        }
        
        updateChart(dataToShow, itemProgress);
        
        if (sectionIndex !== currentSection) {
          currentSection = sectionIndex;
        }
      }
    }
  });
  
  return compassTrigger;
}

// Split Panel Scroll Lock Component
function splitScrollLock() {
  // Get elements
  const scrollWrap = document.querySelector('.split-scroll-lock_contain.u-container-large');
  const listItems = gsap.utils.toArray('.split-scroll-lock_content_list_item');
  const textWrap = document.querySelector('.split-scroll-lock_content_text_wrap');
  const textElements = textWrap ? gsap.utils.toArray('.split-scroll-lock_content_text_wrap > *') : [];
  const outerImages = gsap.utils.toArray('.split-scroll-lock_graphic_outer_image');
  const innerImages = gsap.utils.toArray('.split-scroll-lock_graphic_inner_image');
  const itemCount = listItems.length;
  
  // Exit if elements don't exist
  if (!scrollWrap || itemCount === 0) return;

  // Function to calculate and set min-height for text wrap
  function updateTextWrapHeight() {
    if (!textWrap || textElements.length === 0) return;
    
    // Reset min-height to auto to get natural heights
    textWrap.style.minHeight = 'auto';
    
    // Calculate tallest element height (excluding margin)
    let maxHeight = 0;
    textElements.forEach(element => {
      const height = element.getBoundingClientRect().height;
      maxHeight = Math.max(maxHeight, height);
    });
    
    // Set min-height
    textWrap.style.minHeight = `${maxHeight}px`;
  }

  // Initial height calculation
  updateTextWrapHeight();
  
  // Set up resize observer for responsive height updates
  const resizeObserver = new ResizeObserver(() => {
    updateTextWrapHeight();
  });
  
  // Observe the text wrap for size changes
  if (textWrap) {
    resizeObserver.observe(textWrap);
  }

  // Image transition mapping - define which images are active at each step
  const imageStates = [
    { outer: 0, inner: 0 }, // State 1
    { outer: 1, inner: 1 }, // State 2
    { outer: 2, inner: 2 }  // State 3
  ];

  let currentImageState = -1;

  // Function to update active images
  function updateActiveImages(stateIndex) {
    if (stateIndex === currentImageState) return;
    
    // Remove all active classes
    outerImages.forEach(img => img.classList.remove('is-active'));
    innerImages.forEach(img => img.classList.remove('is-active'));
    
    // Add active class to current state images
    if (stateIndex >= 0 && stateIndex < imageStates.length) {
      const state = imageStates[stateIndex];
      
      if (outerImages[state.outer]) {
        outerImages[state.outer].classList.add('is-active');
      }
      if (innerImages[state.inner]) {
        innerImages[state.inner].classList.add('is-active');
      }
    }
    
    currentImageState = stateIndex;
  }

  // Initialize first state
  updateActiveImages(0);
  
  // Create the main ScrollTrigger
  const splitScrollTrigger = ScrollTrigger.create({
    trigger: scrollWrap,
    start: 'center center',
    end: `+=${itemCount * 100}%`,
    pin: true,
    pinSpacing: true,
    pinType: 'fixed',
    scrub: 1,
    onUpdate: (self) => {
      const progress = self.progress;
      const activeIndex = Math.floor(progress * itemCount);
      const itemProgress = (progress * itemCount) % 1;
  
      // Update list items with progress
      listItems.forEach((item, index) => {
        if (index < activeIndex) {
          item.classList.add('is-active');
          gsap.set(item, { '--progress-width': '100%' });
        } else if (index === activeIndex) {
          item.classList.add('is-active');
          gsap.set(item, { '--progress-width': `${itemProgress * 100}%` });
        } else {
          item.classList.remove('is-active');
          gsap.set(item, { '--progress-width': '0%' });
        }
      });
  
      // Update text elements - only the current one is active
      textElements.forEach((text, index) => {
        if (index === activeIndex || (progress >= 1 && index === textElements.length - 1)) {
          text.classList.add('is-active');
        } else {
          text.classList.remove('is-active');
        }
      });
      
      // Update images based on section
      const sectionIndex = Math.min(activeIndex, imageStates.length - 1);
      updateActiveImages(sectionIndex);
    }
  });
  
  // Handle ScrollTrigger refresh on window resize
  window.addEventListener('resize', () => {
    ScrollTrigger.refresh();
  });
  
  // Cleanup function if needed
  splitScrollTrigger.resizeObserver = resizeObserver;
  
  return splitScrollTrigger;
}

// Nav Component - GSAP Reveals
function navComponent() {
  const components = document.querySelectorAll('.nav_1_component');

  components.forEach(component => {
    const container = component;

    // Check if animation should be skipped
    if (shouldSkipAnimation(container, 'bottom 0%')) {
      container.removeAttribute('data-gsap-hide');
      return; // Exit early, skip animation setup
    }

    let navTL;
    let hasAnimated = false;

    // Function to create/recreate animation
    function createAnimation() {
      // Kill existing timeline if it exists to prevent duplicates
      if (navTL) {
        navTL.kill();
      }

      navTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: 'top 80%',
          once: true
        },
        onStart: () => {
          container.removeAttribute('data-gsap-hide');
          hasAnimated = true; // Mark as animated
        }
      });

      if (container) {
        navTL.fromTo(container, {
          opacity: 0
        },
        {
          opacity: 1,
          duration: 1.25,
          ease: defaultEasingOut
        }, 1.5);
      }
    }

    // Initial call to create animation
    createAnimation();
  });
}

// Homepage Hero Component - GSAP Reveals
function homepageHeroComponent() {
  const components = document.querySelectorAll('.hero-home_wrap');

  components.forEach(component => {
    const container = component.querySelector('.hero-home_contain');
    const headings = component.querySelectorAll('.hero-home_content_wrap .c-heading');
    const paragraphs = component.querySelectorAll('.hero-home_content_wrap .c-paragraph *');
    const buttons = component.querySelectorAll('.hero-home_content_wrap .button_main_wrap');
    const graphic = component.querySelectorAll('.hero-home_graphic_wrap');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    // Check if animation should be skipped
    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return; // Exit early, skip animation setup
    }

    let homepageHeroTL;
    let allHeadingLines = [];
    let allParagraphLines = [];
    let hasAnimated = false;
    let headingSplits = [];
    let paragraphSplits = [];

    // Split heading text
    headings.forEach(text => {
      const split = new SplitText(text, {
        type: 'lines',
        mask: "lines",
        linesClass: "gsap-line"
      });
      headingSplits.push(split);
      allHeadingLines.push(...split.lines);
    });

    // Split paragraph text
    paragraphs.forEach(text => {
      const split = new SplitText(text, {
        type: 'lines',
        mask: "lines",
        linesClass: "gsap-line"
      });
      paragraphSplits.push(split);
      allParagraphLines.push(...split.lines);
    });

    // Function to create/recreate animation
    function createAnimation() {
      // Kill existing timeline if it exists to prevent duplicates
      if (homepageHeroTL) {
        homepageHeroTL.kill();
      }

      homepageHeroTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: 'top 80%',
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
          hasAnimated = true; // Mark as animated
        },
        onComplete: () => {
          headingSplits.forEach(split => split.revert());
          paragraphSplits.forEach(split => split.revert());
  
          // Wait for layout to fully settle after revert
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              ScrollTrigger.refresh();
            });
          });
        }
      });

      if (allHeadingLines.length > 0) {
        homepageHeroTL.fromTo(allHeadingLines, {
          yPercent: headingYPercent,
          opacity: 0
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1.25,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, 0);
      }

      if (allParagraphLines.length > 0) {
        homepageHeroTL.fromTo(allParagraphLines, {
          yPercent: paragraphYPercent,
          opacity: 0
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }

      if (buttons.length > 0) {
        homepageHeroTL.fromTo(buttons, {
          yPercent: buttonsYPercent,
          opacity: 0,
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }

      if (graphic) {
        homepageHeroTL.fromTo(graphic, {
          opacity: 0,
        },
        {
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut
        }, defaultPosition);
      }
    }

    // Initial call to create animation
    createAnimation();
  });
}

// Inner Hero - Basic Component - GSAP Reveals
function innerHeroBasicComponent() {
  const components = document.querySelectorAll('.hero-inner_wrap');

  components.forEach(component => {
    const container = component.querySelector('.hero-inner_contain');
    const headings = component.querySelectorAll('.hero-inner_heading_wrap .c-heading');
    const paragraphs = component.querySelectorAll('.hero-inner_content_wrap .c-paragraph *');
    const buttons = component.querySelectorAll('.hero-inner_content_wrap .button_main_wrap');
    const graphics = component.querySelectorAll('.hero-inner_graphics_image_wrap > *');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    // Check if animation should be skipped
    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return; // Exit early, skip animation setup
    }

    let innerHeroBasicTL;
    let allHeadingLines = [];
    let allParagraphLines = [];
    let hasAnimated = false;
    let headingSplits = [];
    let paragraphSplits = [];

    // Split heading text
    headings.forEach(text => {
      const split = new SplitText(text, {
        type: 'lines',
        mask: "lines",
        linesClass: "gsap-line"
      });
      headingSplits.push(split);
      allHeadingLines.push(...split.lines);
    });

    // Split paragraph text
    paragraphs.forEach(text => {
      const split = new SplitText(text, {
        type: 'lines',
        mask: "lines",
        linesClass: "gsap-line"
      });
      paragraphSplits.push(split);
      allParagraphLines.push(...split.lines);
    });

    // Function to create/recreate animation
    function createAnimation() {
      // Kill existing timeline if it exists to prevent duplicates
      if (innerHeroBasicTL) {
        innerHeroBasicTL.kill();
      }

      innerHeroBasicTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: 'top 80%',
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
          hasAnimated = true; // Mark as animated
        },
        onComplete: () => {
          headingSplits.forEach(split => split.revert());
          paragraphSplits.forEach(split => split.revert());
  
          // Wait for layout to fully settle after revert
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              ScrollTrigger.refresh();
            });
          });
        }
      });

      if (allHeadingLines.length > 0) {
        innerHeroBasicTL.fromTo(allHeadingLines, {
          yPercent: headingYPercent,
          opacity: 0
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1.25,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, 0);
      }

      if (allParagraphLines.length > 0) {
        innerHeroBasicTL.fromTo(allParagraphLines, {
          yPercent: paragraphYPercent,
          opacity: 0
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }

      if (buttons.length > 0) {
        innerHeroBasicTL.fromTo(buttons, {
          yPercent: buttonsYPercent,
          opacity: 0,
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }

      if (graphics.length > 0) {
        innerHeroBasicTL.fromTo(graphics, {
          opacity: 0,
        },
        {
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: (defaultStagger * 2.5)
        }, defaultPosition);
      }
    }

    // Initial call to create animation
    createAnimation();
  });
}

// Inner Hero - Styles Component - GSAP Reveals
function innerHeroStyledComponent() {
  const components = document.querySelectorAll('.hero-inner-styled_wrap');

  components.forEach(component => {
    const container = component.querySelector('.hero-inner-styled_contain');
    const headings = component.querySelectorAll('.hero-inner-styled_heading_wrap .c-heading');
    const paragraphs = component.querySelectorAll('.hero-inner-styled_text_wrap .c-paragraph *');
    const buttons = component.querySelectorAll('.hero-inner-styled_text_wrap .button_main_wrap');
    const graphics = component.querySelectorAll('.hero-inner-styled_graphics_1 > * > *, .hero-inner-styled_graphics_2 > * > *');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    // Check if animation should be skipped
    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return; // Exit early, skip animation setup
    }

    let innerHeroStyledTL;
    let allHeadingLines = [];
    let allParagraphLines = [];
    let hasAnimated = false;
    let headingSplits = [];
    let paragraphSplits = [];

    // Split heading text
    headings.forEach(text => {
      const split = new SplitText(text, {
        type: 'lines',
        mask: "lines",
        linesClass: "gsap-line"
      });
      headingSplits.push(split);
      allHeadingLines.push(...split.lines);
    });

    // Split paragraph text
    paragraphs.forEach(text => {
      const split = new SplitText(text, {
        type: 'lines',
        mask: "lines",
        linesClass: "gsap-line"
      });
      paragraphSplits.push(split);
      allParagraphLines.push(...split.lines);
    });

    // Function to create/recreate animation
    function createAnimation() {
      // Kill existing timeline if it exists to prevent duplicates
      if (innerHeroStyledTL) {
        innerHeroStyledTL.kill();
      }

      innerHeroStyledTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: 'top 80%',
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
          hasAnimated = true; // Mark as animated
        },
        onComplete: () => {
          headingSplits.forEach(split => split.revert());
          paragraphSplits.forEach(split => split.revert());
  
          // Wait for layout to fully settle after revert
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              ScrollTrigger.refresh();
            });
          });
        }
      });

      if (allHeadingLines.length > 0) {
        innerHeroStyledTL.fromTo(allHeadingLines, {
          yPercent: headingYPercent,
          opacity: 0
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1.25,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, 0);
      }

      if (allParagraphLines.length > 0) {
        innerHeroStyledTL.fromTo(allParagraphLines, {
          yPercent: paragraphYPercent,
          opacity: 0
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }

      if (buttons.length > 0) {
        innerHeroStyledTL.fromTo(buttons, {
          yPercent: buttonsYPercent,
          opacity: 0,
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }

      if (graphics.length > 0) {
        innerHeroStyledTL.fromTo(graphics, {
          opacity: 0,
        },
        {
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: (defaultStagger * 2.5)
        }, defaultPosition);
      }
    }

    // Initial call to create animation
    createAnimation();
  });
}

// Heading with Images Component - GSAP Reveals
function headingWithImagesComponent() {
  const components = document.querySelectorAll('.about_wrap');

  components.forEach(component => {
    const container = component.querySelector('.about_contain');
    const headingText = component.querySelectorAll('.about_heading_text');
    const headingImages = component.querySelectorAll('.about_heading_image');
    const paragraphs = component.querySelectorAll('.about_text_wrap .c-paragraph *');
    const buttons = component.querySelectorAll('.about_text_wrap .button_main_wrap');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    // Check if animation should be skipped
    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return; // Exit early, skip animation setup
    }

    let headingWithImagesTL;
    let allHeadingLines = [];
    let allParagraphLines = [];
    let hasAnimated = false;
    let headingSplits = [];
    let paragraphSplits = [];

    // Split heading text
    headingText.forEach(text => {
      const split = new SplitText(text, {
        type: 'lines',
        mask: "lines",
        linesClass: "gsap-line"
      });
      headingSplits.push(split);
      allHeadingLines.push(...split.lines);
    });

    // Split paragraph text
    paragraphs.forEach(text => {
      const split = new SplitText(text, {
        type: 'lines',
        mask: "lines",
        linesClass: "gsap-line"
      });
      paragraphSplits.push(split);
      allParagraphLines.push(...split.lines);
    });

    // Function to create/recreate animation
    function createAnimation() {
      // Kill existing timeline if it exists to prevent duplicates
      if (headingWithImagesTL) {
        headingWithImagesTL.kill();
      }

      headingWithImagesTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: 'top 80%',
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
          hasAnimated = true; // Mark as animated
        },
        onComplete: () => {
          headingSplits.forEach(split => split.revert());
          paragraphSplits.forEach(split => split.revert());
  
          // Wait for layout to fully settle after revert
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              ScrollTrigger.refresh();
            });
          });
        }
      });

      if (allHeadingLines.length > 0) {
        headingWithImagesTL.fromTo(allHeadingLines, {
          yPercent: headingYPercent,
          opacity: 0
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1.25,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, 0);
      }

      if (headingImages.length > 0) {
        headingWithImagesTL.fromTo(headingImages, {
          width: 0
        },
        {
          width: 'auto',
          duration: 1.5,
          ease: defaultEasingInOut,
          stagger: defaultStagger
        }, defaultPosition);
      }

      if (allParagraphLines.length > 0) {
        headingWithImagesTL.fromTo(allParagraphLines, {
          yPercent: paragraphYPercent,
          opacity: 0
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }

      if (buttons.length > 0) {
        headingWithImagesTL.fromTo(buttons, {
          yPercent: buttonsYPercent,
          opacity: 0,
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }
    }

    // Initial call to create animation
    createAnimation();
  });
}

// Work Scroll Lock Component - GSAP Reveals
function workScrollLockComponent() {
  const components = document.querySelectorAll('.work-sl_wrap');

  components.forEach(component => {
    const headerContainer = component.querySelector('.work-sl_layout.is-header');
    const footerContainer = component.querySelector('.work-sl_layout.is-footer');
    const headings = headerContainer.querySelectorAll('.work-sl_heading_wrap .c-heading');
    const paragraphs = headerContainer.querySelectorAll('.work-sl_content_wrap .c-paragraph *');
    const carousel = component.querySelector('.work-sl_layout.is-carousel-layout');
    const buttons = footerContainer.querySelectorAll('.button_main_wrap');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    // Check if animation should be skipped
    if (shouldSkipAnimation(headerContainer)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return; // Exit early, skip animation setup
    }

    let workScrollLockComponentTL;
    let allHeadingLines = [];
    let allParagraphLines = [];
    let hasAnimated = false;
    let headingSplits = [];
    let paragraphSplits = [];

    // Split heading text
    headings.forEach(text => {
      const split = new SplitText(text, {
        type: 'lines',
        mask: "lines",
        linesClass: "gsap-line"
      });
      headingSplits.push(split);
      allHeadingLines.push(...split.lines);
    });

    // Split paragraph text
    paragraphs.forEach(text => {
      const split = new SplitText(text, {
        type: 'lines',
        mask: "lines",
        linesClass: "gsap-line"
      });
      paragraphSplits.push(split);
      allParagraphLines.push(...split.lines);
    });

    // Function to create/recreate animation
    function createAnimation() {
      // Kill existing timeline if it exists to prevent duplicates
      if (workScrollLockComponentTL) {
        workScrollLockComponentTL.kill();
      }

      workScrollLockComponentTL = gsap.timeline({
        scrollTrigger: {
          trigger: headerContainer,
          start: 'top 80%',
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
          hasAnimated = true; // Mark as animated
        },
        onComplete: () => {
          headingSplits.forEach(split => split.revert());
          paragraphSplits.forEach(split => split.revert());
  
          // Wait for layout to fully settle after revert
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              ScrollTrigger.refresh();
            });
          });
        }
      });

      if (allHeadingLines.length > 0) {
        workScrollLockComponentTL.fromTo(allHeadingLines, {
          yPercent: headingYPercent,
          opacity: 0
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1.25,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, 0);
      }

      if (allParagraphLines.length > 0) {
        workScrollLockComponentTL.fromTo(allParagraphLines, {
          yPercent: paragraphYPercent,
          opacity: 0
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }

      if (carousel) {
        workScrollLockComponentTL.fromTo(carousel, {
          opacity: 0
        },
        {
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
        })
      }

      if (buttons.length > 0) {
        workScrollLockComponentTL.fromTo(buttons, {
          yPercent: buttonsYPercent,
          opacity: 0,
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }
    }

    // Initial call to create animation
    createAnimation();
  });
}

// Showreel Component - GSAP Reveals
function showreelComponent() {
  const components = document.querySelectorAll('.showreel_wrap');

  components.forEach(component => {
    const container = component.querySelector('.showreel_contain');
    const headings = container.querySelectorAll('.showreel_heading_wrap .c-heading');
    const image = container.querySelector('.showreel_image_wrap');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    // Check if animation should be skipped
    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return; // Exit early, skip animation setup
    }

    let showreelComponentTL;
    let allHeadingLines = [];
    let hasAnimated = false;
    let headingSplits = [];

    // Split heading text
    headings.forEach(text => {
      const split = new SplitText(text, {
        type: 'lines',
        mask: "lines",
        linesClass: "gsap-line"
      });
      headingSplits.push(split);
      allHeadingLines.push(...split.lines);
    });

    // Function to create/recreate animation
    function createAnimation() {
      // Kill existing timeline if it exists to prevent duplicates
      if (showreelComponentTL) {
        showreelComponentTL.kill();
      }

      showreelComponentTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: 'top 80%',
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
          hasAnimated = true; // Mark as animated
        },
        onComplete: () => {
          headingSplits.forEach(split => split.revert());
  
          // Wait for layout to fully settle after revert
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              ScrollTrigger.refresh();
            });
          });
        }
      });

      if (allHeadingLines.length > 0) {
        showreelComponentTL.fromTo(allHeadingLines, {
          yPercent: headingYPercent,
          opacity: 0
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1.25,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, 0);
      }

      if (image) {
        showreelComponentTL.fromTo(image, {
          yPercent: 15,
          opacity: 0
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1.25,
          ease: defaultEasingOut
        }, defaultPosition);
      }
    }

    // Initial call to create animation
    createAnimation();
  });
}

// Our Expertise Component - GSAP Reveals
function ourExpertiseComponent() {
  const components = document.querySelectorAll('.our-expertise_wrap');

  components.forEach(component => {
    const container = component.querySelector('.our-expertise_layout');
    const headings = container.querySelectorAll('.our-expertise_heading_wrap .c-heading');
    const paragraphs = container.querySelectorAll('.our-expertise_content_wrap .c-paragraph *');
    const buttons = container.querySelectorAll('.button_main_wrap');
    const images = container.querySelectorAll('.our-expertise_images_wrap .our-expertise_image');
    const hiddenItems = container.querySelectorAll('[data-gsap-hide]');
    const gridContainer = component.querySelector('.our-expertise_grid_wrap');
    const gridItems = gridContainer.querySelectorAll('.our-expertise_grid_item');
    const gridHiddenItems = gridContainer.querySelectorAll('[data-gsap-hide]');

    // Check if animation should be skipped
    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return; // Exit early, skip animation setup
    }

    let ourExpertiseComponentTL;
    let allHeadingLines = [];
    let allParagraphLines = [];
    let hasAnimated = false;
    let headingSplits = [];
    let paragraphSplits = [];

    // Split heading text
    headings.forEach(text => {
      const split = new SplitText(text, {
        type: 'lines',
        mask: "lines",
        linesClass: "gsap-line"
      });
      headingSplits.push(split);
      allHeadingLines.push(...split.lines);
    });

    // Split paragraph text
    paragraphs.forEach(text => {
      const split = new SplitText(text, {
        type: 'lines',
        mask: "lines",
        linesClass: "gsap-line"
      });
      paragraphSplits.push(split);
      allParagraphLines.push(...split.lines);
    });

    // Function to create/recreate animation
    function createAnimation() {
      // Kill existing timeline if it exists to prevent duplicates
      if (ourExpertiseComponentTL) {
        ourExpertiseComponentTL.kill();
      }

      ourExpertiseComponentTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: 'top 80%',
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
          hasAnimated = true; // Mark as animated
        },
        onComplete: () => {
          headingSplits.forEach(split => split.revert());
          paragraphSplits.forEach(split => split.revert());
  
          // Wait for layout to fully settle after revert
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              ScrollTrigger.refresh();
            });
          });
        }
      });

      if (allHeadingLines.length > 0) {
        ourExpertiseComponentTL.fromTo(allHeadingLines, {
          yPercent: headingYPercent,
          opacity: 0
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1.25,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, 0);
      }

      if (images.length > 0) {
        ourExpertiseComponentTL.fromTo(images, {
          opacity: 0,
        },
        {
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, "<1");
      }

      if (allParagraphLines.length > 0) {
        ourExpertiseComponentTL.fromTo(allParagraphLines, {
          yPercent: paragraphYPercent,
          opacity: 0
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }

      if (buttons.length > 0) {
        ourExpertiseComponentTL.fromTo(buttons, {
          yPercent: buttonsYPercent,
          opacity: 0,
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }
    }

    // Initial call to create animation
    createAnimation();

    // Check if animation should be skipped
    if (shouldSkipAnimation(gridContainer)) {
      gridHiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return; // Exit early, skip animation setup
    }

    const ourExpertiseComponentGridTL = gsap.timeline({
      scrollTrigger: {
        trigger: gridContainer,
        start: 'top 80%',
        once: true
      },
      onStart: () => {
        gridHiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      }
    });

    if (gridItems.length > 0) {
      ourExpertiseComponentGridTL.fromTo(gridItems, {
        yPercent: 100,
        opacity: 0,
      },
      {
        yPercent: 0,
        opacity: 1,
        duration: 1,
        ease: defaultEasingOut,
        stagger: defaultStagger
      }, defaultPosition);
    }
  });
}

// Logo Carousel Component - GSAP Reveals
function logoCarouselComponent() {
  const components = document.querySelectorAll('.logo-carousel_wrap');

  components.forEach(component => {
    const container = component.querySelector('.logo-carousel_contain');
    const headings = component.querySelectorAll('.logo-carousel_content_wrap .c-heading');
    const paragraphs = component.querySelectorAll('.logo-carousel_content_wrap .c-paragraph *');
    const carouselWrap = component.querySelector('.logo-carousel_inner_wrap');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    // Check if animation should be skipped
    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return; // Exit early, skip animation setup
    }

    let logoCarouselTL;
    let allHeadingLines = [];
    let allParagraphLines = [];
    let hasAnimated = false;
    let headingSplits = [];
    let paragraphSplits = [];

    // Split heading text
    headings.forEach(text => {
      const split = new SplitText(text, {
        type: 'lines',
        mask: "lines",
        linesClass: "gsap-line"
      });
      headingSplits.push(split);
      allHeadingLines.push(...split.lines);
    });

    // Split paragraph text
    paragraphs.forEach(text => {
      const split = new SplitText(text, {
        type: 'lines',
        mask: "lines",
        linesClass: "gsap-line"
      });
      paragraphSplits.push(split);
      allParagraphLines.push(...split.lines);
    });

    // Function to create/recreate animation
    function createAnimation() {
      // Kill existing timeline if it exists to prevent duplicates
      if (logoCarouselTL) {
        logoCarouselTL.kill();
      }

      logoCarouselTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: 'top 80%',
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
          hasAnimated = true; // Mark as animated
        },
        onComplete: () => {
          headingSplits.forEach(split => split.revert());
          paragraphSplits.forEach(split => split.revert());
  
          // Wait for layout to fully settle after revert
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              ScrollTrigger.refresh();
            });
          });
        }
      });

      if (allHeadingLines.length > 0) {
        logoCarouselTL.fromTo(allHeadingLines, {
          yPercent: headingYPercent,
          opacity: 0
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1.25,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, 0);
      }

      if (allParagraphLines.length > 0) {
        logoCarouselTL.fromTo(allParagraphLines, {
          yPercent: paragraphYPercent,
          opacity: 0
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }

      if (carouselWrap) {
        logoCarouselTL.fromTo(carouselWrap, {
          opacity: 0
        },
        {
          opacity: 1,
          duration: 0.8,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }
    }

    // Initial call to create animation
    createAnimation();
  });
}

// Conscious Compass Component - GSAP Reveals
function consciousCompassComponent() {
  const components = document.querySelectorAll('.compass_wrap');

  components.forEach(component => {
    const headerContainer = component.querySelector('.compass_contain.is-header');
    const container = component.querySelector('.compass_contain.is-lock');
    const eyebrows = headerContainer.querySelectorAll('.eyebrow_text *');
    const headings = headerContainer.querySelectorAll('.c-heading');
    const compassGraphic = container.querySelector('.compass_graphic_wrap');
    const paragraphs = container.querySelectorAll('.compass_content_text.is-active .c-paragraph *');
    const listItems = container.querySelectorAll('.compass_content_list_item');
    const buttons = container.querySelectorAll('.button_main_wrap');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    // Check if animation should be skipped
    if (shouldSkipAnimation(headerContainer)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return; // Exit early, skip animation setup
    }

    let consciousCompassTL;
    let allEyebrowLines = [];
    let allHeadingLines = [];
    let allParagraphLines = [];
    let hasAnimated = false;
    let eyebrowSplits = [];
    let headingSplits = [];
    let paragraphSplits = [];

    // Split eyebrow text
    eyebrows.forEach(text => {
      const split = new SplitText(text, {
        type: 'lines',
        mask: "lines",
        linesClass: "gsap-line"
      });
      eyebrowSplits.push(split);
      allEyebrowLines.push(...split.lines);
    });

    // Split heading text
    headings.forEach(text => {
      const split = new SplitText(text, {
        type: 'lines',
        mask: "lines",
        linesClass: "gsap-line"
      });
      headingSplits.push(split);
      allHeadingLines.push(...split.lines);
    });

    // Split paragraph text
    paragraphs.forEach(text => {
      const split = new SplitText(text, {
        type: 'lines',
        mask: "lines",
        linesClass: "gsap-line"
      });
      paragraphSplits.push(split);
      allParagraphLines.push(...split.lines);
    });

    // Function to create/recreate animation
    function createAnimation() {
      // Kill existing timeline if it exists to prevent duplicates
      if (consciousCompassTL) {
        consciousCompassTL.kill();
      }

      consciousCompassTL = gsap.timeline({
        scrollTrigger: {
          trigger: headerContainer,
          start: 'top 80%',
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
          hasAnimated = true; // Mark as animated
        },
        onComplete: () => {
          eyebrowSplits.forEach(split => split.revert());
          headingSplits.forEach(split => split.revert());
          paragraphSplits.forEach(split => split.revert());
  
          // Wait for layout to fully settle after revert
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              ScrollTrigger.refresh();
            });
          });
        }
      });

      if (allEyebrowLines.length > 0) {
        consciousCompassTL.fromTo(allEyebrowLines, {
          yPercent: paragraphYPercent,
          opacity: 0
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, 0);
      }

      if (allHeadingLines.length > 0) {
        consciousCompassTL.fromTo(allHeadingLines, {
          yPercent: headingYPercent,
          opacity: 0
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1.25,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }

      if (compassGraphic) {
        consciousCompassTL.fromTo(compassGraphic, {
          opacity: 0
        },
        {
          opacity: 1,
          duration: 0.8,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }

      if (allParagraphLines.length > 0) {
        consciousCompassTL.fromTo(allParagraphLines, {
          yPercent: paragraphYPercent,
          opacity: 0
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }

      if (listItems.length > 0) {
        consciousCompassTL.fromTo(listItems, {
          yPercent: 100,
          opacity: 0,
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, ">-0.5");
      }

      if (buttons.length > 0) {
        consciousCompassTL.fromTo(buttons, {
          yPercent: buttonsYPercent,
          opacity: 0,
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }
    }

    // Initial call to create animation
    createAnimation();
  });
}

// Podcast Episodes Slider Component - GSAP Reveals
function podcastEpisodesSliderComponent() {
  const components = document.querySelectorAll('.podcast-eps_wrap');

  components.forEach(component => {
    const container = component.querySelector('.podcast-eps_contain');
    const eyebrows = component.querySelectorAll('.podcast-eps_content_wrap .eyebrow_text *');
    const headings = component.querySelectorAll('.podcast-eps_content_wrap .c-heading');
    const paragraphs = component.querySelectorAll('.podcast-eps_content_wrap .c-paragraph *');
    const buttons = component.querySelectorAll('.button_main_wrap');
    const featuredPodcastSlider = component.querySelector('.podcast-eps_slider_featured-col');
    const thumbsPodcastSliders = component.querySelectorAll('.podcast-eps_slider_thumbs_wrap > *');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    // Check if animation should be skipped
    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return; // Exit early, skip animation setup
    }

    let podcastEpisodesSliderTL;
    let allEyebrowLines = [];
    let allHeadingLines = [];
    let allParagraphLines = [];
    let hasAnimated = false;
    let eyebrowSplits = [];
    let headingSplits = [];
    let paragraphSplits = [];

    // Split eyebrow text
    eyebrows.forEach(text => {
      const split = new SplitText(text, {
        type: 'lines',
        mask: "lines",
        linesClass: "gsap-line"
      });
      eyebrowSplits.push(split);
      allEyebrowLines.push(...split.lines);
    });

    // Split heading text
    headings.forEach(text => {
      const split = new SplitText(text, {
        type: 'lines',
        mask: "lines",
        linesClass: "gsap-line"
      });
      headingSplits.push(split);
      allHeadingLines.push(...split.lines);
    });

    // Split paragraph text
    paragraphs.forEach(text => {
      const split = new SplitText(text, {
        type: 'lines',
        mask: "lines",
        linesClass: "gsap-line"
      });
      paragraphSplits.push(split);
      allParagraphLines.push(...split.lines);
    });

    // Function to create/recreate animation
    function createAnimation() {
      // Kill existing timeline if it exists to prevent duplicates
      if (podcastEpisodesSliderTL) {
        podcastEpisodesSliderTL.kill();
      }

      podcastEpisodesSliderTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: 'top 80%',
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
          hasAnimated = true; // Mark as animated
        },
        onComplete: () => {
          eyebrowSplits.forEach(split => split.revert());
          headingSplits.forEach(split => split.revert());
          paragraphSplits.forEach(split => split.revert());
  
          // Wait for layout to fully settle after revert
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              ScrollTrigger.refresh();
            });
          });
        }
      });

      if (allEyebrowLines.length > 0) {
        podcastEpisodesSliderTL.fromTo(allEyebrowLines, {
          yPercent: paragraphYPercent,
          opacity: 0
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, 0);
      }

      if (allHeadingLines.length > 0) {
        podcastEpisodesSliderTL.fromTo(allHeadingLines, {
          yPercent: headingYPercent,
          opacity: 0
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1.25,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }

      if (allParagraphLines.length > 0) {
        podcastEpisodesSliderTL.fromTo(allParagraphLines, {
          yPercent: paragraphYPercent,
          opacity: 0
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }

      if (buttons.length > 0) {
        podcastEpisodesSliderTL.fromTo(buttons, {
          yPercent: buttonsYPercent,
          opacity: 0,
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }

      if (featuredPodcastSlider) {
        podcastEpisodesSliderTL.fromTo(featuredPodcastSlider, {
          opacity: 0
        },
        {
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }

      if (thumbsPodcastSliders.length > 0) {
        podcastEpisodesSliderTL.fromTo(thumbsPodcastSliders, {
          opacity: 0
        },
        {
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }
    }

    // Initial call to create animation
    createAnimation();
  });
}

// Above Footer CTA Component - GSAP Reveals
function aboveFooterCTAComponent() {
  const components = document.querySelectorAll('.footer-cta_wrap');

  components.forEach(component => {
    const container = component.querySelector('.footer-cta_contain');
    const eyebrows = component.querySelectorAll('.footer-cta_content_wrap .eyebrow_text *');
    const headings = component.querySelectorAll('.footer-cta_content_heading');
    const images = component.querySelectorAll('.footer-cta_background-images *');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    // Check if animation should be skipped
    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return; // Exit early, skip animation setup
    }

    let aboveFooterCTAComponentTL;
    let allEyebrowLines = [];
    let allHeadingLines = [];
    let hasAnimated = false;
    let eyebrowSplits = [];
    let headingSplits = [];

    // Split eyebrow text
    eyebrows.forEach(text => {
      const split = new SplitText(text, {
        type: 'lines',
        mask: "lines",
        linesClass: "gsap-line"
      });
      eyebrowSplits.push(split);
      allEyebrowLines.push(...split.lines);
    });

    // Split heading text
    headings.forEach(text => {
      const split = new SplitText(text, {
        type: 'lines',
        mask: "lines",
        linesClass: "gsap-line"
      });
      headingSplits.push(split);
      allHeadingLines.push(...split.lines);
    });

    // Function to create/recreate animation
    function createAnimation() {
      // Kill existing timeline if it exists to prevent duplicates
      if (aboveFooterCTAComponentTL) {
        aboveFooterCTAComponentTL.kill();
      }

      aboveFooterCTAComponentTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: 'top 80%',
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
          hasAnimated = true; // Mark as animated
        },
        onComplete: () => {
          eyebrowSplits.forEach(split => split.revert());
          headingSplits.forEach(split => split.revert());
  
          // Wait for layout to fully settle after revert
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              ScrollTrigger.refresh();
            });
          });
        }
      });

      if (allEyebrowLines.length > 0) {
        aboveFooterCTAComponentTL.fromTo(allEyebrowLines, {
          yPercent: paragraphYPercent,
          opacity: 0
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, 0);
      }

      if (allHeadingLines.length > 0) {
        aboveFooterCTAComponentTL.fromTo(allHeadingLines, {
          yPercent: headingYPercent,
          opacity: 0
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1.25,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }

      if (images.length > 0) {
        aboveFooterCTAComponentTL.fromTo(images, {
          opacity: 0
        },
        {
          opacity: 1,
          duration: 0.8,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }
    }

    // Initial call to create animation
    createAnimation();
  });
}

// Split Scroll Lock Component - GSAP Reveals
function splitScrollLockComponent() {
  const components = document.querySelectorAll('.split-scroll-lock_wrap');

  components.forEach(component => {
    const headerContainer = component.querySelector('.split-scroll-lock_contain.is-header');
    const container = component.querySelector('.split-scroll-lock_contain.is-lock');
    const eyebrows = headerContainer.querySelectorAll('.eyebrow_text *');
    const headings = headerContainer.querySelectorAll('.c-heading');
    const headerParagraphs = headerContainer.querySelectorAll('.c-paragraph *');
    const imageContainer = container.querySelector('.split-scroll-lock_graphic_wrap');
    const paragraphs = container.querySelectorAll('.split-scroll-lock_content_text.is-active .c-paragraph *');
    const listItems = container.querySelectorAll('.split-scroll-lock_content_list_item');
    const buttons = container.querySelectorAll('.button_main_wrap');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    // Check if animation should be skipped
    if (shouldSkipAnimation(headerContainer)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return; // Exit early, skip animation setup
    }

    let splitScrollLockTL;
    let allEyebrowLines = [];
    let allHeadingLines = [];
    let allHeaderParagraphLines = [];
    let allParagraphLines = [];
    let hasAnimated = false;
    let eyebrowSplits = [];
    let headingSplits = [];
    let headerParagraphSplits = [];
    let paragraphSplits = [];

    // Split eyebrow text
    eyebrows.forEach(text => {
      const split = new SplitText(text, {
        type: 'lines',
        mask: "lines",
        linesClass: "gsap-line"
      });
      eyebrowSplits.push(split);
      allEyebrowLines.push(...split.lines);
    });

    // Split heading text
    headings.forEach(text => {
      const split = new SplitText(text, {
        type: 'lines',
        mask: "lines",
        linesClass: "gsap-line"
      });
      headingSplits.push(split);
      allHeadingLines.push(...split.lines);
    });

    // Split header paragraph text
    headerParagraphs.forEach(text => {
      const split = new SplitText(text, {
        type: 'lines',
        mask: "lines",
        linesClass: "gsap-line"
      });
      headerParagraphSplits.push(split);
      allHeaderParagraphLines.push(...split.lines);
    });

    // Split paragraph text
    paragraphs.forEach(text => {
      const split = new SplitText(text, {
        type: 'lines',
        mask: "lines",
        linesClass: "gsap-line"
      });
      paragraphSplits.push(split);
      allParagraphLines.push(...split.lines);
    });

    // Function to create/recreate animation
    function createAnimation() {
      // Kill existing timeline if it exists to prevent duplicates
      if (splitScrollLockTL) {
        splitScrollLockTL.kill();
      }

      splitScrollLockTL = gsap.timeline({
        scrollTrigger: {
          trigger: headerContainer,
          start: 'top 80%',
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
          hasAnimated = true; // Mark as animated
        },
        onComplete: () => {
          eyebrowSplits.forEach(split => split.revert());
          headingSplits.forEach(split => split.revert());
          headerParagraphSplits.forEach(split => split.revert());
          paragraphSplits.forEach(split => split.revert());
  
          // Wait for layout to fully settle after revert
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              ScrollTrigger.refresh();
            });
          });
        }
      });

      if (allEyebrowLines.length > 0) {
        splitScrollLockTL.fromTo(allEyebrowLines, {
          yPercent: paragraphYPercent,
          opacity: 0
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, 0);
      }

      if (allHeadingLines.length > 0) {
        splitScrollLockTL.fromTo(allHeadingLines, {
          yPercent: headingYPercent,
          opacity: 0
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1.25,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }

      if (allHeaderParagraphLines.length > 0) {
        splitScrollLockTL.fromTo(allHeaderParagraphLines, {
          yPercent: paragraphYPercent,
          opacity: 0
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }

      if (imageContainer) {
        splitScrollLockTL.fromTo(imageContainer, {
          opacity: 0
        },
        {
          opacity: 1,
          duration: 0.8,
          ease: defaultEasingOut
        }, defaultPosition);
      }

      if (allParagraphLines.length > 0) {
        splitScrollLockTL.fromTo(allParagraphLines, {
          yPercent: paragraphYPercent,
          opacity: 0
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }

      if (listItems.length > 0) {
        splitScrollLockTL.fromTo(listItems, {
          yPercent: 100,
          opacity: 0,
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, ">-0.5");
      }

      if (buttons.length > 0) {
        splitScrollLockTL.fromTo(buttons, {
          yPercent: buttonsYPercent,
          opacity: 0,
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }
    }

    // Initial call to create animation
    createAnimation();
  });
}

// Compass Teaser Component - GSAP Reveals
function compassTeaserComponent() {
  const components = document.querySelectorAll('.conscious-compass-teaser_wrap');

  components.forEach(component => {
    const container = component.querySelector('.conscious-compass-teaser_contain');
    const eyebrows = component.querySelectorAll('.ct_page-label');
    const headings = component.querySelectorAll('.ct_header-section h2');
    const paragraphs = component.querySelectorAll('.ct_sub-heading, .ct_intro-text');
    const questionGroups = component.querySelectorAll('.ct_question-group');
    const buttons = component.querySelectorAll('button.ct_btn-submit');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    // Check if animation should be skipped
    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return; // Exit early, skip animation setup
    }

    let compassTeaserComponentTL;
    let allEyebrowLines = [];
    let allHeadingLines = [];
    let allParagraphLines = [];
    let hasAnimated = false;
    let eyebrowSplits = [];
    let headingSplits = [];
    let paragraphSplits = [];

    // Split eyebrow text
    eyebrows.forEach(text => {
      const split = new SplitText(text, {
        type: 'lines',
        mask: "lines",
        linesClass: "gsap-line"
      });
      eyebrowSplits.push(split);
      allEyebrowLines.push(...split.lines);
    });

    // Split heading text
    headings.forEach(text => {
      const split = new SplitText(text, {
        type: 'lines',
        mask: "lines",
        linesClass: "gsap-line"
      });
      headingSplits.push(split);
      allHeadingLines.push(...split.lines);
    });

    // Split paragraph text
    paragraphs.forEach(text => {
      const split = new SplitText(text, {
        type: 'lines',
        mask: "lines",
        linesClass: "gsap-line"
      });
      paragraphSplits.push(split);
      allParagraphLines.push(...split.lines);
    });

    // Function to create/recreate animation
    function createAnimation() {
      // Kill existing timeline if it exists to prevent duplicates
      if (compassTeaserComponentTL) {
        compassTeaserComponentTL.kill();
      }

      compassTeaserComponentTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: 'top 80%',
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
          hasAnimated = true; // Mark as animated
        },
        onComplete: () => {
          eyebrowSplits.forEach(split => split.revert());
          headingSplits.forEach(split => split.revert());
          paragraphSplits.forEach(split => split.revert());

          // Wait for layout to fully settle after revert
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              ScrollTrigger.refresh();
            });
          });
        }
      });

      if (allEyebrowLines.length > 0) {
        compassTeaserComponentTL.fromTo(allEyebrowLines, {
          yPercent: paragraphYPercent,
          opacity: 0
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, 0);
      }

      if (allHeadingLines.length > 0) {
        compassTeaserComponentTL.fromTo(allHeadingLines, {
          yPercent: headingYPercent,
          opacity: 0
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1.25,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }

      if (allParagraphLines.length > 0) {
        compassTeaserComponentTL.fromTo(allParagraphLines, {
          yPercent: paragraphYPercent,
          opacity: 0
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }

      if (questionGroups.length > 0) {
        compassTeaserComponentTL.fromTo(questionGroups, {
          opacity: 0
        },
        {
          opacity: 1,
          duration: 0.8,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }

      if (buttons.length > 0) {
        compassTeaserComponentTL.fromTo(buttons, {
          yPercent: buttonsYPercent,
          opacity: 0,
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }
    }

    // Initial call to create animation
    createAnimation();
  });
}

// FIT Assessment Component - GSAP Reveals
function fitAssessmentComponent() {
  const components = document.querySelectorAll('.fit-assessment_wrap');

  components.forEach(component => {
    const container = component.querySelector('.fit-assessment_contain');
    const innerContainer = component.querySelector('.fit_container');
    const eyebrows = component.querySelectorAll('.fit_highlight');
    const headings = component.querySelectorAll('.fit_content h1, .fit_content h2');
    const paragraphs = component.querySelectorAll('.fit_content > p');
    const formGroups = component.querySelectorAll('.fit_form-group');
    const buttons = component.querySelectorAll('button.fit_button-swipe');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    // Check if animation should be skipped
    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return; // Exit early, skip animation setup
    }

    let fitAssessmentComponentTL;
    let allEyebrowLines = [];
    let allHeadingLines = [];
    let allParagraphLines = [];
    let hasAnimated = false;
    let eyebrowSplits = [];
    let headingSplits = [];
    let paragraphSplits = [];

    // Split eyebrow text
    eyebrows.forEach(text => {
      const split = new SplitText(text, {
        type: 'lines',
        mask: "lines",
        linesClass: "gsap-line"
      });
      eyebrowSplits.push(split);
      allEyebrowLines.push(...split.lines);
    });

    // Split heading text
    headings.forEach(text => {
      const split = new SplitText(text, {
        type: 'lines',
        mask: "lines",
        linesClass: "gsap-line"
      });
      headingSplits.push(split);
      allHeadingLines.push(...split.lines);
    });

    // Split paragraph text
    paragraphs.forEach(text => {
      const split = new SplitText(text, {
        type: 'lines',
        mask: "lines",
        linesClass: "gsap-line"
      });
      paragraphSplits.push(split);
      allParagraphLines.push(...split.lines);
    });

    // Function to create/recreate animation
    function createAnimation() {
      // Kill existing timeline if it exists to prevent duplicates
      if (fitAssessmentComponentTL) {
        fitAssessmentComponentTL.kill();
      }

      fitAssessmentComponentTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: 'top 80%',
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
          hasAnimated = true; // Mark as animated
        },
        onComplete: () => {
          eyebrowSplits.forEach(split => split.revert());
          headingSplits.forEach(split => split.revert());
          paragraphSplits.forEach(split => split.revert());

          // Wait for layout to fully settle after revert
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              ScrollTrigger.refresh();
            });
          });
        }
      });

      if (innerContainer) {
        fitAssessmentComponentTL.fromTo(innerContainer, {
          opacity: 0
        },
        {
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut
        }, 0)
      }

      if (allEyebrowLines.length > 0) {
        fitAssessmentComponentTL.fromTo(allEyebrowLines, {
          yPercent: paragraphYPercent,
          opacity: 0
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }

      if (allHeadingLines.length > 0) {
        fitAssessmentComponentTL.fromTo(allHeadingLines, {
          yPercent: headingYPercent,
          opacity: 0
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1.25,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }

      if (allParagraphLines.length > 0) {
        fitAssessmentComponentTL.fromTo(allParagraphLines, {
          yPercent: paragraphYPercent,
          opacity: 0
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }

      if (formGroups.length > 0) {
        fitAssessmentComponentTL.fromTo(formGroups, {
          opacity: 0
        },
        {
          opacity: 1,
          duration: 0.8,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }

      if (buttons.length > 0) {
        fitAssessmentComponentTL.fromTo(buttons, {
          yPercent: buttonsYPercent,
          opacity: 0,
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, defaultPosition);
      }
    }

    // Initial call to create animation
    createAnimation();
  });
}

// Footer Component - GSAP Reveals
function footerComponent() {
  const components = document.querySelectorAll('.footer_1_wrap');

  components.forEach(component => {
    const container = component.querySelector('.footer_1_contain.u-container');
    const headings = component.querySelectorAll('.footer_1_tagline');
    const footerLinkGroups = component.querySelectorAll('.footer_1_group_wrap');
    const newsletterWrap = component.querySelector('.footer_1_newsletter_wrap');
    const copyrightWrap = component.querySelector('.footer_1_copyright_wrap');
    const wordmarkWrap = component.querySelector('.footer_1_wordmark_wrap');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    // Check if animation should be skipped
    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return; // Exit early, skip animation setup
    }

    let footerComponentTL;
    let allHeadingLines = [];
    let hasAnimated = false;
    let headingSplits = [];

    // Split heading text
    headings.forEach(text => {
      const split = new SplitText(text, {
        type: 'lines',
        mask: "lines",
        linesClass: "gsap-line"
      });
      headingSplits.push(split);
      allHeadingLines.push(...split.lines);
    });

    // Function to create/recreate animation
    function createAnimation() {
      // Kill existing timeline if it exists to prevent duplicates
      if (footerComponentTL) {
        footerComponentTL.kill();
      }

      footerComponentTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: 'top 80%',
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
          hasAnimated = true; // Mark as animated
        },
        onComplete: () => {
          headingSplits.forEach(split => split.revert());
  
          // Wait for layout to fully settle after revert
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              ScrollTrigger.refresh();
            });
          });
        }
      });

      if (allHeadingLines.length > 0) {
        footerComponentTL.fromTo(allHeadingLines, {
          yPercent: headingYPercent,
          opacity: 0
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1.25,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, ">");
      }

      if (footerLinkGroups.length > 0) {
        footerComponentTL.fromTo(footerLinkGroups, {
          opacity: 0
        },
        {
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, ">-0.5");
      }

      if (newsletterWrap) {
        footerComponentTL.fromTo(newsletterWrap, {
          opacity: 0
        },
        {
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut
        }, ">-0.5");
      }

      if (copyrightWrap) {
        footerComponentTL.fromTo(copyrightWrap, {
          opacity: 0
        },
        {
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut
        }, ">-0.5");
      }

      if (wordmarkWrap) {
        footerComponentTL.fromTo(wordmarkWrap, {
          opacity: 0
        },
        {
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut
        }, ">-1");
      }
    }

    // Initial call to create animation
    createAnimation();
  });
}

// Init Function
const init = () => {
  console.debug("%cRun init", "color: lightgreen;");

  setupLenis();
  swipers();
  initGsapAnimations();
  workGridMasonry();
  accordionSection();
  timelineAccordion();
  odometers();
  marquees();
  formStuff();
  expertiseStackNav();
  heroVantaBG();
  finsweetStuff();
  
  // Delay non-pinned animations slightly
  // setTimeout(() => {
  //   initScrollAnimations();
  // }, 50);
  
  // Single refresh after everything
  setTimeout(() => {
    ScrollTrigger.refresh(true);
  }, 200);

  // Track which elements have been measured to avoid unnecessary refreshes
  const measuredSizes = new WeakMap();

  const resizeObserver = new ResizeObserver((entries) => {
    let needsRefresh = false;
    
    entries.forEach(entry => {
      const element = entry.target;
      const newHeight = entry.borderBoxSize[0].blockSize;
      const previousHeight = measuredSizes.get(element);
      
      // Only flag for refresh if height actually changed (not initial measurement)
      if (previousHeight !== undefined && previousHeight !== newHeight) {
        needsRefresh = true;
      }
      
      measuredSizes.set(element, newHeight);
    });
    
    // Batch refresh once after all measurements
    if (needsRefresh) {
      ScrollTrigger.refresh();
    }
  });

  // Observe only components that cause layout shifts
  document.querySelectorAll('.accordion-section_wrap, .load-more, .about_wrap').forEach(el => {
    resizeObserver.observe(el);
  });
  
}; // end init

$(window).on("load", init);
