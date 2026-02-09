console.debug("%cScripts.js loadeds", "color: lightgreen;");

// Preserve scroll position on refresh
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

let lenis;
let odometersAnimating = false;

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

// Global GSAP Variables
let headingYPercent = 150;
let paragraphYPercent = 150;
let paragraphYPercentNoMask = 100;
let buttonsYPercent = 150;
let headingY = 30;
let paragraphY = 30;
let defaultStagger = 0.1;
let imageMaskedSwipeStart = "polygon(0 0, 0 0, 0 100%, 0 100%)";
let imageMaskedSwipeEnd = "polygon(0 0, 100% 0, 100% 100%, 0 100%)";
let defaultPosition = ">-0.5";
let defaultEasingIn = 'power3.in';
let defaultEasingOut = 'power3.out';
let defaultEasingInOut = 'power3.inOut';

// Track first tween for each timeline
const timelineFirstTween = new WeakMap();

function getPosition(timeline, position = defaultPosition) {
  // If this timeline hasn't had a tween yet, use 0 for first tween
  if (!timelineFirstTween.has(timeline)) {
    timelineFirstTween.set(timeline, true);
    return 0;
  }
  // Otherwise use the provided position
  return position;
}

// =====================================================
// TEXT ANIMATION HELPERS - iOS Compatible
// =====================================================

// iOS Detection (cached for performance)
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isPortrait = window.innerHeight > window.innerWidth || window.innerWidth < 768;

/**
 * Returns appropriate ScrollTrigger start position based on viewport
 * Uses aspect ratio to detect tall/narrow screens (mobile portrait)
 * 
 * @param {String|Number} mobilePercent - Mobile start position (e.g., '70%' or 70)
 * @param {String|Number} desktopPercent - Desktop start position (e.g., '80%' or 80)
 * @returns {String} ScrollTrigger start position (e.g., 'top 70%')
 */
function getAnimationStart(mobilePercent = 70, desktopPercent = 80) {
  // Normalize inputs - handle both '70%' and 70
  const mobile = typeof mobilePercent === 'string'
    ? mobilePercent
    : `${mobilePercent}%`;
  const desktop = typeof desktopPercent === 'string'
    ? desktopPercent
    : `${desktopPercent}%`;

  // Check if viewport is portrait (taller than wide) or narrow
  const isPortraitOrNarrow = window.innerHeight > window.innerWidth || window.innerWidth < 768;

  return isPortraitOrNarrow ? `top ${mobile}` : `top ${desktop}`;
}

/**
 * Creates text splits for animation, skipping on mobile devices.
 * Returns an object with split instances and lines arrays.
 * 
 * Modern Technique: Uses object destructuring in return for clean API
 * 
 * @param {NodeList|Array} elements - Elements to split
 * @param {Object} options - SplitText configuration
 * @param {Boolean} options.mask - Enable/disable masking (default: true)
 * @returns {Object} { splits: Array, lines: Array, shouldSplit: Boolean }
 */
function createTextSplits(elements, options = {}) {
  const splits = [];
  const lines = [];
  const shouldSplit = !isPortrait;

  if (!shouldSplit || !elements || elements.length === 0) {
    return { splits, lines, shouldSplit };
  }

  // Extract mask option with default true
  const { mask = true, ...restOptions } = options;

  const defaultOptions = {
    type: 'lines',
    linesClass: 'gsap-line',
    ...(mask && { mask: 'lines' }), // Conditionally add mask property
    ...restOptions // Merge remaining user options
  };

  elements.forEach(element => {
    const split = new SplitText(element, defaultOptions);
    splits.push(split);
    lines.push(...split.lines); // Spread operator flattens arrays
  });

  return { splits, lines, shouldSplit };
}

/**
 * Animates text elements with appropriate method based on device.
 * Uses line-by-line animation on desktop, whole-element animation on iOS.
 * 
 * Modern Technique: Single function handles both animation modes
 * 
 * @param {gsap.core.Timeline} timeline - GSAP timeline to add animation to
 * @param {Object} config - Animation configuration
 * @param {NodeList|Array} config.elements - Elements to animate
 * @param {Array} config.lines - Split lines (from createTextSplits)
 * @param {Boolean} config.shouldSplit - Whether splitting occurred
 * @param {Number} config.yPercent - Line animation yPercent (default: headingYPercent)
 * @param {Number} config.y - Whole element y offset for iOS (default: headingY)
 * @param {String} config.position - Timeline position (default: ">")
 * @param {Number} config.duration - Animation duration
 * @param {Number|Object} config.stagger - Stagger value (default: defaultStagger)
 * @param {Object} config.fromVars - Additional from vars
 * @param {Object} config.toVars - Additional to vars
 */
function animateText(timeline, config) {
  const {
    elements,
    lines,
    shouldSplit,
    yPercent = headingYPercent,
    y = headingY,
    position = ">",
    duration = 1.25,
    stagger = defaultStagger,
    fromVars = {},
    toVars = {}
  } = config; // Object destructuring with default values

  // iOS: Animate whole elements
  if (!shouldSplit && elements && elements.length > 0) {
    timeline.fromTo(elements, {
      y,
      opacity: 0,
      ...fromVars // Spread allows custom properties
    }, {
      y: 0,
      opacity: 1,
      duration,
      ease: defaultEasingOut,
      stagger,
      ...toVars
    }, getPosition(timeline, position));
  }
  // Desktop: Animate split lines
  else if (shouldSplit && lines && lines.length > 0) {
    timeline.fromTo(lines, {
      yPercent,
      opacity: 0,
      ...fromVars
    }, {
      yPercent: 0,
      opacity: 1,
      duration,
      ease: defaultEasingOut,
      stagger,
      ...toVars
    }, getPosition(timeline, position));
  }
}

let refreshTimeout;
function scheduleScrollTriggerRefresh(layoutChanged = false) {
  if (!layoutChanged || odometersAnimating) return;

  if (refreshTimeout) clearTimeout(refreshTimeout);
  refreshTimeout = setTimeout(() => {
    lenis?.resize();
    ScrollTrigger.refresh();
  }, 100);
}

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
    innerHeroImageGridComponent();
    cmsHeroPodcastComponent();
    cmsHeroWorkComponent();
    innerHero404Component();
    headingWithImagesComponent();
    workScrollLockComponent();
    showreelComponent();
    ourExpertiseComponent();
    logoCarouselComponent();
    consciousCompassComponent();
    podcastEpisodesSliderComponent();
    aboveFooterCTAComponent();
    workGridComponent();
    splitScrollLockComponent();
    iconGridComponent();
    featuredWorkComponent();
    testimonialComponent();
    compassCTAComponent();
    splitPanelImageArrayComponent();
    compassFormComponent();
    culturalImpactComponent();
    podcastListComponent();
    statGridComponent();
    officesComponent();
    twoImageSliderComponent();
    accordionSectionComponent();
    splitPanelImageComponent();
    careersComponent();
    careerPostComponent();
    cmsPodcastBodyComponent();
    cmsWorkOverviewComponent();
    cmsWorkImageGridComponent();
    cmsWorkSplitContentComponent();
    cmsWorkFullImageComponent();
    cmsWorkTestimonialComponent();
    cmsWorkCreditsComponent();
    contactFormComponent();
    basicContentComponent();
    expertiseStackComponent();
    iconCardsComponent();
    attributesGridComponent();
    attributeCalloutComponent();
    teamGridComponent();
    footerComponent();
    dataAnimationComponent();
    setTimeout(compassTeaserComponent, 200);
    setTimeout(fitAssessmentComponent, 200);
  });

  // Refresh after all animations registered
  ScrollTrigger.refresh();
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
        allowTouchMove: true,
        preventClicks: false,
        preventClicksPropagation: false,
        touchStartPreventDefault: false,
        threshold: 10,
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
        allowTouchMove: true,
        preventClicks: false,
        preventClicksPropagation: false,
        touchStartPreventDefault: false,
        threshold: 10,
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
        allowTouchMove: true,
        preventClicks: false,
        preventClicksPropagation: false,
        touchStartPreventDefault: false,
        threshold: 10,
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
function workGridMasonry() {
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

        // Expose instance globally for Finsweet integration
        window.macyInstance = macyInstance;

        macyInstance.runOnImageLoad(() => {
          macyInstance.recalculate(true);
          // Restore animation states after Macy is done
          restoreAnimationStates(animationStates);
        }, true);
      }, 10);
    } else {
      // Clear global instance when in single column
      window.macyInstance = null;
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
function accordionSection() {
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
        duration: 0.5,
        ease: 'power3.inOut'
      }, position);

      // Fade in content (no y movement)
      if (paragraph) {
        timeline.from(paragraph, {
          opacity: 0,
          duration: 0.4,
          ease: 'power3.out'
        }, position + 0.2); // Slight delay for better effect
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
        duration: 0.5,
        ease: 'power3.inOut'
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
                start: "top 102%",
                invalidateOnRefresh: !0,
                onEnter: function onEnter() {
                  // odometersAnimating = true;

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
  window.addEventListener('message', function (event) {
    // HubSpot forms post messages from their iframe
    if (event.data.type === 'hsFormCallback' && event.data.eventName === 'onFormSubmitted') {
      // console.log('HubSpot form submitted:', event.data);
      const id = event.data.id;
      // console.log(id);

      // Delay refresh slightly to ensure DOM updates are complete
      setTimeout(() => {
        ScrollTrigger.refresh();
        // console.log('ScrollTrigger refreshed after form submission');
        const anchor = document.querySelector(`section:has([class*="${id}"])`);
        // console.log(anchor);
        if (anchor) {
          // anchor.scrollIntoView({ behavior: 'smooth' });
          lenis.scrollTo(anchor, {
            offset: 0,
            duration: 1
          })
        }
      }, 100);
    }
  });

  // Alternative: If using HubSpot's embed code directly (not iframe)
  window.HubSpotConversations?.on?.('conversationStarted', function () {
    ScrollTrigger.refresh();
    // console.log('ScrollTrigger refreshed after form submission (not iframe)');
  });


  // Compass Form
  const form = document.getElementById('assessment-form');

  if (form) {
    form.addEventListener('submit', function (e) {
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
  window.addEventListener('resize', function () {
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
      listInstances.forEach((list) => {
        list.addHook("afterRender", (items) => {
          // 1. Animate new items first
          podcastListComponent();
          workGridComponent();

          // 2. Recalculate masonry layout (if Macy instance exists)
          if (window.macyInstance) {
            window.macyInstance.recalculate(true);
          }

          // 3. Force layout recalculation
          document.body.offsetHeight;

          // 4. Refresh ScrollTrigger and Lenis after layout settles
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              ScrollTrigger.refresh();
              lenis.resize();

              // 5. Trigger scroll recalculation
              window.scrollBy(0, 1);
              setTimeout(() => {
                window.scrollBy(0, -1);
              }, 0);
            });
          });
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

// Helper function
function shouldSkipAnimation(container, startPosition = 'bottom 20%') {
  const scrollY = window.scrollY || window.pageYOffset;
  const viewportHeight = window.innerHeight;
  if (!container) return;
  const rect = container.getBoundingClientRect();

  const [edge, percentString] = startPosition.split(' ');
  const percent = parseFloat(percentString) / 100;

  let triggerY;

  if (edge === 'top') {
    triggerY = rect.top + scrollY;
  } else if (edge === 'bottom') {
    triggerY = rect.bottom + scrollY;
  } else {
    triggerY = rect.top + scrollY;
  }

  const triggerActivationY = scrollY + (viewportHeight * percent);

  return triggerY < triggerActivationY;
}

// Work Scroll Lock Component
function workScrollLock() {
  document.querySelectorAll('.work-sl_contain').forEach((container, containerIndex) => {
    const carouselLayout = container.querySelector('.work-sl_layout.is-carousel-layout');
    const collectionWrap = container.querySelector('.work-sl_collection_wrap');
    const collectionList = container.querySelector('.work-sl_collection_list');
    const collectionItems = container.querySelectorAll('.work-sl_collection_item');
    const progressBar = container.querySelector('.work-sl_carousel_progress');

    const getScrollDistance = () => {
      const computedStyle = window.getComputedStyle(collectionList);
      const paddingLeft = parseFloat(computedStyle.paddingLeft);
      const paddingRight = parseFloat(computedStyle.paddingRight);
      const totalPadding = paddingLeft + paddingRight;
      return collectionWrap.scrollWidth - window.innerWidth + totalPadding;
    };

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: carouselLayout,
        start: 'center center',
        end: () => `+=${getScrollDistance() * 2}`,
        scrub: true,
        pin: true,
        invalidateOnRefresh: true,
        pinSpacing: true,
        pinType: "fixed",
        onUpdate: (self) => {
          if (progressBar) {
            const adjustedProgress = Math.max(0, Math.min(1, (self.progress - 0.1) / 0.8));
            gsap.set(progressBar, {
              width: `${adjustedProgress * 100}%`
            });
          }
        }
      }
    });

    tl.to({}, { duration: 0.1 });
    tl.to(collectionList, {
      x: () => -getScrollDistance(),
      ease: 'none',
      duration: 0.8
    });
    tl.to({}, { duration: 0.1 });
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      ScrollTrigger.refresh(true);
    }, 250);
  });
};

// Compass Scroll Lock Component with SVG Chart
function compassScrollLock() {
  const chartStates = [
    [20, 45, 55, 10, 70, 25, 50, 45],
    [45, 20, 45, 55, 10, 70, 25, 50],
    [50, 45, 20, 45, 55, 10, 70, 25]
  ];

  const chartConfig = {
    labels: ['Awake', 'Aware', 'Reflective', 'Attentive', 'Cogent', 'Sentient', 'Visionary', 'Intentional'],
    centerX: 226,
    centerY: 226,
    maxRadius: 225
  };

  const compassWrap = document.querySelector('.compass_wrap');
  const listItems = gsap.utils.toArray('.compass_content_list_item');
  const itemCount = listItems.length;

  if (!compassWrap || itemCount === 0) return;

  let chartContainer = document.querySelector('.compass_graphic_wrap');
  if (!chartContainer) {
    console.error('Chart container not found');
    return;
  }

  if (chartContainer.tagName === 'CANVAS') {
    const svgContainer = document.createElement('div');
    svgContainer.className = chartContainer.className;
    chartContainer.parentNode.replaceChild(svgContainer, chartContainer);
    chartContainer = svgContainer;
  }

  chartContainer.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="-100 -50 652 552" style="width: 100%; height: 100%;">
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
      <polygon class="data-shape" 
               points="" 
               fill="rgba(222, 228, 46, 0.7)" 
               stroke="#DEE42E" 
               stroke-width="2"/>
      <g class="data-points"></g>
      <g class="grid-lines">
        <path d="M226 169.75L186.225 186.225L169.75 226L186.225 265.775L206.113 274.012L226 282.25L265.775 265.775L282.25 226L265.775 186.225L226 169.75ZM226 113.5L146.451 146.451L113.5 226L146.451 305.549L226 338.5L305.549 305.549L338.5 226L305.549 146.451L226 113.5ZM226 57.25L106.676 106.676L57.25 226L106.676 345.324L226 394.75L345.324 345.324L394.75 226L345.324 106.676L226 57.25ZM226 1L66.901 66.901L1 226L66.901 385.099L226 451L385.099 385.099L451 226L385.099 66.901L226 1Z" 
              stroke="#11171E" stroke-width="1.5" fill="none" opacity="0.9"/>
      </g>
      <g class="center-lines"></g>
      <g class="chart-labels"></g>
    </svg>
  `;

  const svg = chartContainer.querySelector('svg');
  const dataShape = svg.querySelector('.data-shape');
  const dataPointsGroup = svg.querySelector('.data-points');
  const centerLinesGroup = svg.querySelector('.center-lines');
  const labelsGroup = svg.querySelector('.chart-labels');

  function calculateDataPoints(data) {
    return data.map((value, index) => {
      const normalizedValue = (value / 100) * chartConfig.maxRadius;
      const angle = (index * 2 * Math.PI / data.length) - Math.PI / 2;
      const x = chartConfig.centerX + normalizedValue * Math.cos(angle);
      const y = chartConfig.centerY + normalizedValue * Math.sin(angle);
      return { x, y, value };
    });
  }

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

  function updateChart(data, progress = 1) {
    const points = calculateDataPoints(data);
    const pointsString = points.map(p => `${p.x},${p.y}`).join(' ');

    gsap.to(dataShape, {
      attr: { points: pointsString },
      duration: 0.5,
      ease: 'ease'
    });

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

  function interpolateData(data1, data2, progress) {
    return data1.map((val, i) => val + (data2[i] - val) * progress);
  }

  let currentSection = 0;
  updateChart(chartStates[0]);

  const compassTrigger = ScrollTrigger.create({
    trigger: compassWrap,
    start: 'center center-=3%',
    end: `+=${itemCount * 100}%`,
    pin: true,
    pinSpacing: true,
    scroller: document.body,
    pinType: "fixed",
    scrub: true,
    onUpdate: (self) => {
      const progress = self.progress;
      const activeIndex = Math.floor(progress * itemCount);
      const itemProgress = (progress * itemCount) % 1;

      const textElements = gsap.utils.toArray('.compass_content_text');

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

      textElements.forEach((text, index) => {
        if (index === activeIndex || (progress >= 1 && index === textElements.length - 1)) {
          text.classList.add('is-active');
        } else {
          text.classList.remove('is-active');
        }
      });

      const sectionIndex = Math.min(activeIndex, chartStates.length - 1);

      if (sectionIndex !== currentSection || (itemProgress > 0 && sectionIndex < chartStates.length - 1)) {
        let dataToShow;

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
  const scrollWrap = document.querySelector('.split-scroll-lock_contain.u-container-large');
  const listItems = gsap.utils.toArray('.split-scroll-lock_content_list_item');
  const textWrap = document.querySelector('.split-scroll-lock_content_text_wrap');
  const textElements = textWrap ? gsap.utils.toArray('.split-scroll-lock_content_text_wrap > *') : [];
  const outerImages = gsap.utils.toArray('.split-scroll-lock_graphic_outer_image');
  const innerImages = gsap.utils.toArray('.split-scroll-lock_graphic_inner_image');
  const itemCount = listItems.length;

  if (!scrollWrap || itemCount === 0) return;

  function updateTextWrapHeight() {
    if (!textWrap || textElements.length === 0) return;

    textWrap.style.minHeight = 'auto';

    let maxHeight = 0;
    textElements.forEach(element => {
      const height = element.getBoundingClientRect().height;
      maxHeight = Math.max(maxHeight, height);
    });

    textWrap.style.minHeight = `${maxHeight}px`;
  }

  updateTextWrapHeight();

  const resizeObserver = new ResizeObserver(() => {
    updateTextWrapHeight();
  });

  if (textWrap) {
    resizeObserver.observe(textWrap);
  }

  const imageStates = [
    { outer: 0, inner: 0 },
    { outer: 1, inner: 1 },
    { outer: 2, inner: 2 }
  ];

  let currentImageState = -1;

  function updateActiveImages(stateIndex) {
    if (stateIndex === currentImageState) return;

    outerImages.forEach(img => img.classList.remove('is-active'));
    innerImages.forEach(img => img.classList.remove('is-active'));

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

  updateActiveImages(0);

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

      listItems.forEach((item, index) => {
        if (index < activeIndex) {
          item.classList.add('is-active');
          gsap.set(item, { '--progress-width': '100%' });
        } else if (index === activeIndex) {
          item.classList.add('is-active');
          gsap.set(item, { '--progress-width': `${itemProgress * 100}%` });
          // Only animate if not already animating
          if (innerImages[index] && !innerImages[index].classList.contains('is-animated')) {
            gsap.fromTo(innerImages[index], {
              clipPath: imageMaskedSwipeStart
            },
              {
                clipPath: imageMaskedSwipeEnd,
                duration: 1.5,
                ease: defaultEasingInOut,
                onStart: () => {
                  innerImages[index].classList.add('is-animated');
                }
              });
          }
        } else {
          item.classList.remove('is-active');
          gsap.set(item, { '--progress-width': '0%' });
        }
      });

      textElements.forEach((text, index) => {
        if (index === activeIndex || (progress >= 1 && index === textElements.length - 1)) {
          text.classList.add('is-active');
        } else {
          text.classList.remove('is-active');
        }
      });

      const sectionIndex = Math.min(activeIndex, imageStates.length - 1);
      updateActiveImages(sectionIndex);
    }
  });

  window.addEventListener('resize', () => {
    ScrollTrigger.refresh();
  });

  splitScrollTrigger.resizeObserver = resizeObserver;

  return splitScrollTrigger;
}

// Nav Component - GSAP Reveals
function navComponent() {
  const components = document.querySelectorAll('.nav_1_component');

  components.forEach(component => {
    const container = component;

    if (shouldSkipAnimation(container, 'bottom 0%')) {
      container.removeAttribute('data-gsap-hide');
      return;
    }

    let navTL;

    function createAnimation() {
      if (navTL) {
        navTL.kill();
      }

      navTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          container.removeAttribute('data-gsap-hide');
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
          }, 1);
      }
    }

    createAnimation();
  });
}

// Homepage Hero Component - GSAP Reveals
function homepageHeroComponent() {
  const components = document.querySelectorAll('.hero-home_wrap');

  components.forEach(component => {
    const container = component.querySelector('.hero-home_contain');
    const headings = component.querySelectorAll('.hero-home_content_wrap .c-heading');
    const paragraphs = component.querySelectorAll('.hero-home_content_wrap .c-paragraph > *');
    const buttons = component.querySelectorAll('.hero-home_content_wrap .button_main_wrap');
    const graphic = component.querySelectorAll('.hero-home_graphic_wrap');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const headingSplitData = createTextSplits(headings);
    // const paragraphSplitData = createTextSplits(paragraphs);
    const paragraphSplitData = createTextSplits(paragraphs, { mask: false });

    let homepageHeroTL;

    function createAnimation() {
      if (homepageHeroTL) {
        homepageHeroTL.kill();
      }

      homepageHeroTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (headingSplitData.shouldSplit) {
            headingSplitData.splits.forEach(s => s.revert());
          }
          if (paragraphSplitData.shouldSplit) {
            paragraphSplitData.splits.forEach(s => s.revert());
          }

          scheduleScrollTriggerRefresh();
        }
      });

      animateText(homepageHeroTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: 0,
        duration: 1.25
      });

      animateText(homepageHeroTL, {
        elements: paragraphs,
        lines: paragraphSplitData.lines,
        shouldSplit: paragraphSplitData.shouldSplit,
        yPercent: paragraphYPercentNoMask,
        y: paragraphY,
        position: ">-0.5",
        duration: 1
      });

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

    createAnimation();
  });
}

// Inner Hero - Basic Component - GSAP Reveals
function innerHeroBasicComponent() {
  const components = document.querySelectorAll('.hero-inner_wrap');

  components.forEach(component => {
    const container = component.querySelector('.hero-inner_contain');
    const headings = component.querySelectorAll('.hero-inner_heading_wrap .c-heading');
    const paragraphs = component.querySelectorAll('.hero-inner_content_wrap .c-paragraph > *');
    const buttons = component.querySelectorAll('.hero-inner_content_wrap .button_main_wrap');
    const graphics = component.querySelectorAll('.hero-inner_graphics_image_wrap > *');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const headingSplitData = createTextSplits(headings);
    // const paragraphSplitData = createTextSplits(paragraphs);
    const paragraphSplitData = createTextSplits(paragraphs, { mask: false });

    let innerHeroBasicTL;

    function createAnimation() {
      if (innerHeroBasicTL) {
        innerHeroBasicTL.kill();
      }

      innerHeroBasicTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (headingSplitData.shouldSplit) {
            headingSplitData.splits.forEach(s => s.revert());
          }
          if (paragraphSplitData.shouldSplit) {
            paragraphSplitData.splits.forEach(s => s.revert());
          }

          scheduleScrollTriggerRefresh();
        }
      });

      animateText(innerHeroBasicTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: 0,
        duration: 1.25
      });

      animateText(innerHeroBasicTL, {
        elements: paragraphs,
        lines: paragraphSplitData.lines,
        shouldSplit: paragraphSplitData.shouldSplit,
        yPercent: paragraphYPercentNoMask,
        y: paragraphY,
        position: defaultPosition,
        duration: 1
      });

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
          clipPath: imageMaskedSwipeStart
        },
          {
            clipPath: imageMaskedSwipeEnd,
            duration: 1.5,
            ease: defaultEasingOut,
            stagger: (defaultStagger * 2.5)
          }, ">-1");
      }

      // if (graphics.length > 0) {
      //   innerHeroBasicTL.fromTo(graphics, {
      //     opacity: 0,
      //   },
      //   {
      //     opacity: 1,
      //     duration: 1,
      //     ease: defaultEasingOut,
      //     stagger: (defaultStagger * 2.5)
      //   }, ">-1");
      // }
    }

    createAnimation();
  });
}

// Inner Hero - Styles Component - GSAP Reveals
function innerHeroStyledComponent() {
  const components = document.querySelectorAll('.hero-inner-styled_wrap');

  components.forEach(component => {
    const container = component.querySelector('.hero-inner-styled_contain');
    const headings = component.querySelectorAll('.hero-inner-styled_heading_wrap .c-heading');
    const paragraphs = component.querySelectorAll('.hero-inner-styled_text_wrap .c-paragraph > *');
    const buttons = component.querySelectorAll('.hero-inner-styled_text_wrap .button_main_wrap');
    const graphics = component.querySelectorAll('[class*="hero-inner-styled_graphics_"] > * > *');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');
    const textShadowItems = component.querySelectorAll('.u-text-shadow');

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const headingSplitData = createTextSplits(headings);
    // const paragraphSplitData = createTextSplits(paragraphs);
    const paragraphSplitData = createTextSplits(paragraphs, { mask: false });

    let innerHeroStyledTL;

    function createAnimation() {
      if (innerHeroStyledTL) {
        innerHeroStyledTL.kill();
      }

      innerHeroStyledTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (headingSplitData.shouldSplit) {
            headingSplitData.splits.forEach(s => s.revert());
          }
          if (paragraphSplitData.shouldSplit) {
            paragraphSplitData.splits.forEach(s => s.revert());
          }
          textShadowItems.forEach(item => {
            item.classList.add('is-darker-shadow');
          });

          scheduleScrollTriggerRefresh();
        }
      });

      animateText(innerHeroStyledTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: 0,
        duration: 1.25
      });

      animateText(innerHeroStyledTL, {
        elements: paragraphs,
        lines: paragraphSplitData.lines,
        shouldSplit: paragraphSplitData.shouldSplit,
        yPercent: paragraphYPercentNoMask,
        y: paragraphY,
        position: defaultPosition,
        duration: 1
      });

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
          clipPath: imageMaskedSwipeStart
        },
          {
            clipPath: imageMaskedSwipeEnd,
            duration: 1.5,
            ease: defaultEasingOut,
            stagger: (defaultStagger * 2.5)
          }, ">-1");
      }

      // if (graphics.length > 0) {
      //   innerHeroStyledTL.fromTo(graphics, {
      //     opacity: 0,
      //   },
      //   {
      //     opacity: 1,
      //     duration: 1,
      //     ease: defaultEasingOut,
      //     stagger: (defaultStagger * 2.5)
      //   }, ">-1");
      // }
    }

    createAnimation();
  });
}

// Inner Hero - Image Grid - GSAP Reveals
function innerHeroImageGridComponent() {
  const components = document.querySelectorAll('.hero-inner-image-grid_wrap');

  components.forEach(component => {
    const container = component.querySelector('.hero-inner-image-grid_contain');
    const headings = component.querySelectorAll('.hero-inner-image-grid_heading_wrap .c-heading');
    const paragraphs = component.querySelectorAll('.hero-inner-image-grid_text_wrap .c-paragraph > *');
    const buttons = component.querySelectorAll('.hero-inner-image-grid_text_wrap .button_main_wrap');
    const graphics = component.querySelectorAll('.m-image-grid_wrap > *');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');
    const textShadowItems = component.querySelectorAll('.u-text-shadow');

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const headingSplitData = createTextSplits(headings);
    // const paragraphSplitData = createTextSplits(paragraphs);
    const paragraphSplitData = createTextSplits(paragraphs, { mask: false });

    let innerHeroImageGridTL;

    function createAnimation() {
      if (innerHeroImageGridTL) {
        innerHeroImageGridTL.kill();
      }

      innerHeroImageGridTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (headingSplitData.shouldSplit) {
            headingSplitData.splits.forEach(s => s.revert());
          }
          if (paragraphSplitData.shouldSplit) {
            paragraphSplitData.splits.forEach(s => s.revert());
          }
          textShadowItems.forEach(item => {
            item.classList.add('is-darker-shadow');
          });

          scheduleScrollTriggerRefresh(true);
        }
      });

      animateText(innerHeroImageGridTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: 0,
        duration: 1.25
      });

      animateText(innerHeroImageGridTL, {
        elements: paragraphs,
        lines: paragraphSplitData.lines,
        shouldSplit: paragraphSplitData.shouldSplit,
        yPercent: paragraphYPercentNoMask,
        y: paragraphY,
        position: ">-0.5",
        duration: 1
      });

      if (buttons.length > 0) {
        innerHeroImageGridTL.fromTo(buttons, {
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
        innerHeroImageGridTL.fromTo(graphics, {
          yPercent: 50,
          opacity: 0,
        },
          {
            yPercent: 0,
            opacity: 1,
            duration: 1,
            ease: defaultEasingOut,
            stagger: (defaultStagger * 2.5)
          }, ">-1");
      }
    }

    createAnimation();
  });
}

// CMS Hero - Podcast Component - GSAP Reveals
function cmsHeroPodcastComponent() {
  const components = document.querySelectorAll('.hero-podcast_wrap');

  components.forEach(component => {
    const container = component.querySelector('.hero-podcast_contain');
    const headings = component.querySelectorAll('.hero-podcast_content_heading');
    const paragraphs = component.querySelectorAll('.hero-podcast_content_subline_wrap, .hero-podcast_content_length');
    const buttons = component.querySelectorAll('.hero-podcast_content_wrap .button_main_wrap');
    const image = component.querySelector('.hero-podcast_image');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const headingSplitData = createTextSplits(headings);

    let cmsHeroPodcastTL;

    function createAnimation() {
      if (cmsHeroPodcastTL) {
        cmsHeroPodcastTL.kill();
      }

      cmsHeroPodcastTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (headingSplitData.shouldSplit) {
            headingSplitData.splits.forEach(split => split.revert());
          }

          scheduleScrollTriggerRefresh(true);
        }
      });

      animateText(cmsHeroPodcastTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: 0,
        duration: 1.25
      });

      if (paragraphs) {
        cmsHeroPodcastTL.fromTo(paragraphs, {
          yPercent: paragraphYPercent,
          opacity: 0
        },
          {
            yPercent: 0,
            opacity: 1,
            duration: 1,
            ease: defaultEasingOut,
            stagger: defaultStagger
          }, ">-0.75");
      }

      if (buttons.length > 0) {
        cmsHeroPodcastTL.fromTo(buttons, {
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

      // if (image) {
      //   cmsHeroPodcastTL.fromTo(image, {
      //     opacity: 0,
      //   },
      //   {
      //     opacity: 1,
      //     duration: 1,
      //     ease: defaultEasingOut
      //   }, ">-1");
      // }

      if (image) {
        cmsHeroPodcastTL.fromTo(image, {
          clipPath: imageMaskedSwipeStart
        },
          {
            clipPath: imageMaskedSwipeEnd,
            duration: 1.75,
            ease: defaultEasingOut
          }, getPosition(cmsHeroPodcastTL, ">-1"));
      }
    }

    createAnimation();
  });
}

// CMS Hero - Work Component - GSAP Reveals
function cmsHeroWorkComponent() {
  const components = document.querySelectorAll('.hero-work_wrap');

  components.forEach(component => {
    const container = component.querySelector('.hero-work_contain');
    const eyebrows = component.querySelectorAll('.eyebrow_text *');
    const headings = component.querySelectorAll('.hero-work_title');
    const paragraphs = component.querySelectorAll('.hero-work_content_wrap .c-paragraph > *');
    const buttons = component.querySelectorAll('.button_main_wrap');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const eyebrowSplitData = createTextSplits(eyebrows);
    const headingSplitData = createTextSplits(headings);
    // const paragraphSplitData = createTextSplits(paragraphs);
    const paragraphSplitData = createTextSplits(paragraphs, { mask: false });

    let cmsHeroWorkTL;

    function createAnimation() {
      if (cmsHeroWorkTL) {
        cmsHeroWorkTL.kill();
      }

      cmsHeroWorkTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (eyebrowSplitData.shouldSplit) {
            eyebrowSplitData.splits.forEach(split => split.revert());
            headingSplitData.splits.forEach(split => split.revert());
            paragraphSplitData.splits.forEach(split => split.revert());
          }

          scheduleScrollTriggerRefresh();
        }
      });

      animateText(cmsHeroWorkTL, {
        elements: eyebrows,
        lines: eyebrowSplitData.lines,
        shouldSplit: eyebrowSplitData.shouldSplit,
        yPercent: paragraphYPercent,
        y: paragraphY,
        duration: 0.8
      });

      animateText(cmsHeroWorkTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        duration: 1.25
      });

      animateText(cmsHeroWorkTL, {
        elements: paragraphs,
        lines: paragraphSplitData.lines,
        shouldSplit: paragraphSplitData.shouldSplit,
        yPercent: paragraphYPercentNoMask,
        y: paragraphY,
        position: ">-0.5",
        duration: 1
      });

      if (buttons.length > 0) {
        cmsHeroWorkTL.fromTo(buttons, {
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

    createAnimation();
  });
}

// Inner Hero - 404 Component - GSAP Reveals
function innerHero404Component() {
  const components = document.querySelectorAll('.hero-404_wrap');

  components.forEach(component => {
    const container = component.querySelector('.hero-404_contain');
    const buttons = component.querySelectorAll('.button_main_wrap');
    const carousel = component.querySelector('._404_carousel_wrap');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    let innerHero404TL;

    function createAnimation() {
      if (innerHero404TL) {
        innerHero404TL.kill();
      }

      innerHero404TL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          scheduleScrollTriggerRefresh();
        }
      });

      if (carousel) {
        innerHero404TL.fromTo(carousel, {
          opacity: 0,
        },
          {
            opacity: 1,
            duration: 1,
            ease: defaultEasingOut
          }, 0);
      }

      if (buttons.length > 0) {
        innerHero404TL.fromTo(buttons, {
          yPercent: buttonsYPercent,
          opacity: 0,
        },
          {
            yPercent: 0,
            opacity: 1,
            duration: 1,
            ease: defaultEasingOut,
            stagger: defaultStagger
          }, 0.75);
      }
    }

    createAnimation();
  });
}
// Heading with Images Component - GSAP Reveals
function headingWithImagesComponent() {
  const components = document.querySelectorAll('.about_wrap');

  components.forEach((component, index) => {
    const container = component.querySelector('.about_contain');
    const headingText = component.querySelectorAll('.about_heading_text');
    const headingImages = component.querySelectorAll('.about_heading_image');
    const paragraphs = component.querySelectorAll('.about_text_wrap .c-paragraph > *');
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

    // IMPORTANT: Ensure images are at full width before SplitText calculates line breaks
    // This ensures SplitText sees the correct layout with images inline
    headingImages.forEach(img => {
      gsap.set(img, { width: 'auto', clearProps: 'width' });
    });

    // Split heading text WITHOUT mask (images need to stay inline)
    headingText.forEach(text => {
      const split = new SplitText(text, {
        type: 'lines',
        linesClass: "gsap-line"
        // NO mask - this prevents overflow:hidden wrappers that break inline images
      });
      headingSplits.push(split);
      allHeadingLines.push(...split.lines);
    });

    // Set images to be invisible but maintain their width (so layout stays at 3 lines)
    headingImages.forEach(img => {
      gsap.set(img, {
        opacity: 0,
        scaleX: 0,
        transformOrigin: 'left center',
        display: 'inline-block',
        verticalAlign: 'middle'
      });
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

    // Expose splits to window for console access
    if (!window.headingWithImagesSplits) window.headingWithImagesSplits = [];
    window.headingWithImagesSplits[index] = {
      headingSplits,
      paragraphSplits,
      revertHeadings: () => headingSplits.forEach(s => s.revert()),
      revertParagraphs: () => paragraphSplits.forEach(s => s.revert()),
      revertAll: () => {
        headingSplits.forEach(s => s.revert());
        paragraphSplits.forEach(s => s.revert());
      }
    };

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
        headingWithImagesTL.to(headingImages, {
          scaleX: 1,
          opacity: 1,
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
    const paragraphs = headerContainer.querySelectorAll('.work-sl_content_wrap .c-paragraph > *');
    const carousel = component.querySelector('.work-sl_layout.is-carousel-layout');
    const itemTitles = component.querySelectorAll('.work-sl_collection_item_content_title');
    const imageWraps = component.querySelectorAll('.work-sl_collection_item_image_wrap');
    const images = component.querySelectorAll('.work-sl_collection_item_image');
    const accentImages = component.querySelectorAll('.work-sl_collection_item_image_accent_wrap');
    const hoverStuff = component.querySelectorAll('.work-sl_collection_item_content_info_wrap > *, .work-sl_collection_item_content_title_icon_wrap > *');
    const buttons = footerContainer.querySelectorAll('.button_main_wrap');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    if (shouldSkipAnimation(footerContainer)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const headingSplitData = createTextSplits(headings);
    const itemTitlesSplitData = createTextSplits(itemTitles);
    // const paragraphSplitData = createTextSplits(paragraphs);
    const paragraphSplitData = createTextSplits(paragraphs, { mask: false });

    let workScrollLockComponentTL;

    function createAnimation() {
      if (workScrollLockComponentTL) {
        workScrollLockComponentTL.kill();
      }

      workScrollLockComponentTL = gsap.timeline({
        scrollTrigger: {
          trigger: headerContainer,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (headingSplitData.shouldSplit) {
            headingSplitData.splits.forEach(split => split.revert());
            paragraphSplitData.splits.forEach(split => split.revert());
            itemTitlesSplitData.splits.forEach(split => split.revert());
          }

          scheduleScrollTriggerRefresh(true);
        }
      });

      animateText(workScrollLockComponentTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: 0,
        duration: 1.25
      });

      animateText(workScrollLockComponentTL, {
        elements: paragraphs,
        lines: paragraphSplitData.lines,
        shouldSplit: paragraphSplitData.shouldSplit,
        yPercent: paragraphYPercentNoMask,
        y: paragraphY,
        position: ">-0.65",
        duration: 1
      });

      if (carousel) {
        workScrollLockComponentTL.fromTo(carousel, {
          opacity: 0
        },
          {
            opacity: 1,
            duration: 1,
            ease: defaultEasingOut,
          }, defaultPosition)
      }

      if (images.length > 0) {
        workScrollLockComponentTL.fromTo(images, {
          clipPath: imageMaskedSwipeStart
        },
          {
            clipPath: imageMaskedSwipeEnd,
            duration: 1.75,
            ease: defaultEasingOut,
            stagger: (defaultStagger * 3)
          }, defaultPosition);
      }

      if (imageWraps.length > 0) {
        workScrollLockComponentTL.fromTo(imageWraps, {
          backgroundColor: 'transparent'
        },
          {
            backgroundColor: 'var(--swatch--dark-900)',
            duration: 0.5,
            ease: defaultEasingOut,
            stagger: (defaultStagger * 3)
          }, "<1.25");
      }

      if (accentImages.length > 0) {
        workScrollLockComponentTL.fromTo(accentImages, {
          opacity: 0
        },
          {
            opacity: 1,
            duration: 0.5,
            ease: defaultEasingOut,
            stagger: (defaultStagger * 3)
          }, "<0.25");
      }

      animateText(workScrollLockComponentTL, {
        elements: itemTitles,
        lines: itemTitlesSplitData.lines,
        shouldSplit: itemTitlesSplitData.shouldSplit,
        position: "<-1",
        duration: 1.25,
        stagger: (defaultStagger * 3)
      });

      if (hoverStuff.length > 0) {
        workScrollLockComponentTL.fromTo(hoverStuff, {
          opacity: 0
        },
          {
            opacity: 1,
            duration: 1,
            ease: defaultEasingOut
          }, ">-1");
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

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const headingSplitData = createTextSplits(headings);

    let showreelComponentTL;

    function createAnimation() {
      if (showreelComponentTL) {
        showreelComponentTL.kill();
      }

      showreelComponentTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (headingSplitData.shouldSplit) {
            headingSplitData.splits.forEach(split => split.revert());
          }

          scheduleScrollTriggerRefresh();
        }
      });

      animateText(showreelComponentTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: 0,
        duration: 1.25
      });

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

    createAnimation();
  });
}

// Our Expertise Component - GSAP Reveals
function ourExpertiseComponent() {
  const components = document.querySelectorAll('.our-expertise_wrap');

  components.forEach(component => {
    const container = component.querySelector('.our-expertise_layout');
    const headings = container.querySelectorAll('.our-expertise_heading_wrap .c-heading');
    const paragraphs = container.querySelectorAll('.our-expertise_content_wrap .c-paragraph > *');
    const buttons = container.querySelectorAll('.button_main_wrap');
    const images = container.querySelectorAll('.our-expertise_images_wrap .our-expertise_image');
    const hiddenItems = container.querySelectorAll('[data-gsap-hide]');
    const gridContainer = component.querySelector('.our-expertise_grid_wrap');
    const gridItems = gridContainer.querySelectorAll('.our-expertise_grid_item');
    const gridHiddenItems = gridContainer.querySelectorAll('[data-gsap-hide]');

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const headingSplitData = createTextSplits(headings);
    // const paragraphSplitData = createTextSplits(paragraphs);
    const paragraphSplitData = createTextSplits(paragraphs, { mask: false });

    let ourExpertiseComponentTL;

    function createAnimation() {
      if (ourExpertiseComponentTL) {
        ourExpertiseComponentTL.kill();
      }

      ourExpertiseComponentTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (headingSplitData.shouldSplit) {
            headingSplitData.splits.forEach(s => s.revert());
          }
          if (paragraphSplitData.shouldSplit) {
            paragraphSplitData.splits.forEach(s => s.revert());
          }

          scheduleScrollTriggerRefresh();
        }
      });

      animateText(ourExpertiseComponentTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: 0,
        duration: 1.25
      });

      animateText(ourExpertiseComponentTL, {
        elements: paragraphs,
        lines: paragraphSplitData.lines,
        shouldSplit: paragraphSplitData.shouldSplit,
        yPercent: paragraphYPercentNoMask,
        y: paragraphY,
        position: ">-0.65",
        duration: 1
      });

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

      if (images.length > 0) {
        ourExpertiseComponentTL.fromTo(images, {
          clipPath: imageMaskedSwipeStart
        },
          {
            clipPath: imageMaskedSwipeEnd,
            duration: 1.5,
            ease: defaultEasingOut,
            stagger: (defaultStagger * 2.5)
          }, 1.25);
      }
    }

    createAnimation();

    if (shouldSkipAnimation(gridContainer)) {
      gridHiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const ourExpertiseComponentGridTL = gsap.timeline({
      scrollTrigger: {
        trigger: gridContainer,
        start: getAnimationStart(),
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
          stagger: (defaultStagger * 2)
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
    const paragraphs = component.querySelectorAll('.logo-carousel_content_wrap .c-paragraph > *');
    const carouselWrap = component.querySelector('.logo-carousel_inner_wrap');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const headingSplitData = createTextSplits(headings);
    // const paragraphSplitData = createTextSplits(paragraphs);
    const paragraphSplitData = createTextSplits(paragraphs, { mask: false });

    let logoCarouselTL;

    function createAnimation() {
      if (logoCarouselTL) {
        logoCarouselTL.kill();
      }

      logoCarouselTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (headingSplitData.shouldSplit) {
            headingSplitData.splits.forEach(s => s.revert());
          }
          if (paragraphSplitData.shouldSplit) {
            paragraphSplitData.splits.forEach(s => s.revert());
          }

          scheduleScrollTriggerRefresh();
        }
      });

      animateText(logoCarouselTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: 0,
        duration: 1.25
      });

      animateText(logoCarouselTL, {
        elements: paragraphs,
        lines: paragraphSplitData.lines,
        shouldSplit: paragraphSplitData.shouldSplit,
        yPercent: paragraphYPercentNoMask,
        y: paragraphY,
        position: ">-0.65",
        duration: 1
      });

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
    const paragraphs = container.querySelectorAll('.compass_content_text .c-paragraph > *');
    const listItems = container.querySelectorAll('.compass_content_list_item');
    const buttons = container.querySelectorAll('.button_main_wrap');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    if (shouldSkipAnimation(headerContainer)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const eyebrowSplitData = createTextSplits(eyebrows);
    const headingSplitData = createTextSplits(headings);
    // const paragraphSplitData = createTextSplits(paragraphs);
    const paragraphSplitData = createTextSplits(paragraphs, { mask: false });

    let consciousCompassTL;

    function createAnimation() {
      if (consciousCompassTL) {
        consciousCompassTL.kill();
      }

      consciousCompassTL = gsap.timeline({
        scrollTrigger: {
          trigger: headerContainer,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (eyebrowSplitData.shouldSplit) {
            eyebrowSplitData.splits.forEach(split => split.revert());
            headingSplitData.splits.forEach(split => split.revert());
            paragraphSplitData.splits.forEach(split => split.revert());
          }

          scheduleScrollTriggerRefresh(true);
        }
      });

      animateText(consciousCompassTL, {
        elements: eyebrows,
        lines: eyebrowSplitData.lines,
        shouldSplit: eyebrowSplitData.shouldSplit,
        yPercent: paragraphYPercent,
        y: paragraphY,
        position: 0,
        duration: 0.8
      });

      animateText(consciousCompassTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: defaultPosition,
        duration: 1.25
      });

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

      animateText(consciousCompassTL, {
        elements: paragraphs,
        lines: paragraphSplitData.lines,
        shouldSplit: paragraphSplitData.shouldSplit,
        yPercent: paragraphYPercentNoMask,
        y: paragraphY,
        position: ">-1",
        duration: 1
      });

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
          }, ">-1");
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
    const paragraphs = component.querySelectorAll('.podcast-eps_content_wrap .c-paragraph > *');
    const buttons = component.querySelectorAll('.button_main_wrap');
    const slidersContainer = component.querySelector('.podcast-eps_slider_wrap');
    const sliderWrappers = component.querySelectorAll('.podcast-eps_slider_main-swiper_wrap, .podcast-eps_slider_thumb-swiper-1_wrap, .podcast-eps_slider_thumb-swiper-2_wrap');
    const featuredPodcastSlider = component.querySelector('.podcast-eps_slider_featured-col');
    const thumbsPodcastSliders = component.querySelectorAll('.podcast-eps_slider_thumbs_wrap > *');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const eyebrowSplitData = createTextSplits(eyebrows);
    const headingSplitData = createTextSplits(headings);
    // const paragraphSplitData = createTextSplits(paragraphs);
    const paragraphSplitData = createTextSplits(paragraphs, { mask: false });

    let podcastEpisodesSliderTL;

    function createAnimation() {
      if (podcastEpisodesSliderTL) {
        podcastEpisodesSliderTL.kill();
      }

      podcastEpisodesSliderTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (eyebrowSplitData.shouldSplit) {
            eyebrowSplitData.splits.forEach(split => split.revert());
            headingSplitData.splits.forEach(split => split.revert());
            paragraphSplitData.splits.forEach(split => split.revert());
          }

          scheduleScrollTriggerRefresh();
        }
      });

      animateText(podcastEpisodesSliderTL, {
        elements: eyebrows,
        lines: eyebrowSplitData.lines,
        shouldSplit: eyebrowSplitData.shouldSplit,
        yPercent: paragraphYPercent,
        y: paragraphY,
        position: 0,
        duration: 0.8
      });

      animateText(podcastEpisodesSliderTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: defaultPosition,
        duration: 1.25
      });

      animateText(podcastEpisodesSliderTL, {
        elements: paragraphs,
        lines: paragraphSplitData.lines,
        shouldSplit: paragraphSplitData.shouldSplit,
        yPercent: paragraphYPercentNoMask,
        y: paragraphY,
        position: ">-0.75",
        duration: 1
      });

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

      if (slidersContainer) {
        podcastEpisodesSliderTL.fromTo(slidersContainer, {
          opacity: 0
        },
          {
            opacity: 1,
            duration: 1.25,
            ease: defaultEasingOut
          }, defaultPosition);
      }

      if (sliderWrappers.length > 0) {
        podcastEpisodesSliderTL.fromTo(sliderWrappers, {
          clipPath: imageMaskedSwipeStart
        },
          {
            clipPath: imageMaskedSwipeEnd,
            duration: 1.75,
            ease: defaultEasingOut,
            stagger: 0.75
          }, defaultPosition);
      }

      // if (featuredPodcastSlider) {
      //   podcastEpisodesSliderTL.fromTo(featuredPodcastSlider, {
      //     opacity: 0
      //   },
      //   {
      //     opacity: 1,
      //     duration: 1,
      //     ease: defaultEasingOut,
      //     stagger: defaultStagger
      //   }, ">-0.75");
      // }

      // if (thumbsPodcastSliders.length > 0) {
      //   podcastEpisodesSliderTL.fromTo(thumbsPodcastSliders, {
      //     opacity: 0
      //   },
      //   {
      //     opacity: 1,
      //     duration: 1,
      //     ease: defaultEasingOut,
      //     stagger: defaultStagger
      //   }, defaultPosition);
      // }
    }

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

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const eyebrowSplitData = createTextSplits(eyebrows);
    const headingSplitData = createTextSplits(headings);

    let aboveFooterCTAComponentTL;

    function createAnimation() {
      if (aboveFooterCTAComponentTL) {
        aboveFooterCTAComponentTL.kill();
      }

      aboveFooterCTAComponentTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (eyebrowSplitData.shouldSplit) {
            eyebrowSplitData.splits.forEach(split => split.revert());
            headingSplitData.splits.forEach(split => split.revert());
          }

          scheduleScrollTriggerRefresh();
        }
      });

      animateText(aboveFooterCTAComponentTL, {
        elements: eyebrows,
        lines: eyebrowSplitData.lines,
        shouldSplit: eyebrowSplitData.shouldSplit,
        yPercent: paragraphYPercent,
        y: paragraphY,
        position: 0,
        duration: 0.8
      });

      animateText(aboveFooterCTAComponentTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: defaultPosition,
        duration: 1.25
      });

      // if (images.length > 0) {
      //   aboveFooterCTAComponentTL.fromTo(images, {
      //     opacity: 0
      //   },
      //   {
      //     opacity: 1,
      //     duration: 0.8,
      //     ease: defaultEasingOut,
      //     stagger: defaultStagger
      //   }, defaultPosition);
      // }

      if (images.length > 0) {
        aboveFooterCTAComponentTL.fromTo(images, {
          clipPath: imageMaskedSwipeStart
        },
          {
            clipPath: imageMaskedSwipeEnd,
            duration: 1,
            ease: defaultEasingOut,
            stagger: (defaultStagger * 2.5)
          }, 1.25);
      }
    }

    createAnimation();
  });
}

// Work Grid Component - GSAP Reveals
function workGridComponent() {
  const components = document.querySelectorAll('.work-grid_wrap');

  components.forEach(component => {
    const container = component.querySelector('.work-grid_contain');
    const items = component.querySelectorAll('.work-grid_collection_item:not([data-gsap-initialized])');
    const buttons = component.querySelectorAll('.button_main_wrap');

    if (!container.hasAttribute('data-gsap-initialized')) {
      container.setAttribute('data-gsap-initialized', 'true');
    }

    // Create individual timeline for each item
    items.forEach((item, index) => {
      item.setAttribute('data-gsap-initialized', 'true');
      if (shouldSkipAnimation(item)) {
        item.querySelectorAll('[data-gsap-hide]').forEach(el => el.removeAttribute('data-gsap-hide'));
        return;
      }

      const itemTitle = item.querySelector('.work-grid_collection_item_content_title');
      const imageWrap = item.querySelector('.work-grid_collection_item_image_wrap');
      const image = item.querySelector('.work-grid_collection_item_image');
      const accentImage = item.querySelector('.work-grid_collection_item_image_accent_wrap');
      const hoverStuff = item.querySelectorAll('.work-sl_collection_item_content_info_wrap > *, .work-sl_collection_item_content_title_icon_wrap > *');
      const hiddenItems = item.querySelectorAll('[data-gsap-hide]');

      const itemTitleSplitData = createTextSplits(itemTitle ? [itemTitle] : []);

      // Calculate delay based on grid position (2 columns on desktop only)
      const isTwoColumn = window.innerWidth > 550;
      const columnIndex = isTwoColumn ? index % 2 : 0;
      const staggerDelay = columnIndex * defaultStagger * 5;

      const itemTL = gsap.timeline({
        scrollTrigger: {
          trigger: item,
          start: getAnimationStart(),
          once: true
        },
        delay: staggerDelay,
        onStart: () => {
          hiddenItems.forEach(el => el.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (itemTitleSplitData.shouldSplit) {
            itemTitleSplitData.splits.forEach(split => split.revert());
          }
          scheduleScrollTriggerRefresh(true);
        }
      });

      if (image) {
        itemTL.fromTo(image, {
          clipPath: imageMaskedSwipeStart
        },
          {
            clipPath: imageMaskedSwipeEnd,
            duration: 1.75,
            ease: defaultEasingOut
          }, 0);
      }

      if (imageWrap) {
        itemTL.fromTo(imageWrap, {
          backgroundColor: 'transparent'
        },
          {
            backgroundColor: 'var(--swatch--dark-900)',
            duration: 0.5,
            ease: defaultEasingOut
          }, "<1.25");
      }

      if (accentImage) {
        itemTL.fromTo(accentImage, {
          opacity: 0
        },
          {
            opacity: 1,
            duration: 0.5,
            ease: defaultEasingOut
          }, "<0.25");
      }

      if (itemTitle) {
        animateText(itemTL, {
          elements: [itemTitle],
          lines: itemTitleSplitData.lines,
          shouldSplit: itemTitleSplitData.shouldSplit,
          position: "<-1",
          duration: 1.25
        });
      }

      if (hoverStuff.length > 0) {
        itemTL.fromTo(hoverStuff, {
          opacity: 0
        },
          {
            opacity: 1,
            duration: 1,
            ease: defaultEasingOut
          }, ">-0.5");
      }
    });

    // Separate timeline for buttons at container level
    if (shouldSkipAnimation(container)) {
      container.querySelectorAll('[data-gsap-hide]').forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    if (buttons.length > 0) {
      const buttonsTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          buttons.forEach(btn => btn.removeAttribute('data-gsap-hide'));
        }
      });

      buttonsTL.fromTo(buttons, {
        yPercent: buttonsYPercent,
        opacity: 0,
      },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, 0);
    }
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
    const headerParagraphs = headerContainer.querySelectorAll('.c-paragraph > *');
    const imageContainer = container.querySelector('.split-scroll-lock_graphic_outer');
    const paragraphs = container.querySelectorAll('.split-scroll-lock_content_text .c-paragraph > *');
    const listItems = container.querySelectorAll('.split-scroll-lock_content_list_item');
    const buttons = container.querySelectorAll('.button_main_wrap');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    if (shouldSkipAnimation(headerContainer)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const eyebrowSplitData = createTextSplits(eyebrows);
    const headingSplitData = createTextSplits(headings);
    // const headerParagraphSplitData = createTextSplits(headerParagraphs);
    const headerParagraphSplitData = createTextSplits(headerParagraphs, { mask: false });
    // const paragraphSplitData = createTextSplits(paragraphs);
    const paragraphSplitData = createTextSplits(paragraphs, { mask: false });

    let splitScrollLockTL;

    gsap.set('.split-scroll-lock_graphic_inner_image', {
      clipPath: imageMaskedSwipeStart
    });

    function createAnimation() {
      if (splitScrollLockTL) {
        splitScrollLockTL.kill();
      }

      splitScrollLockTL = gsap.timeline({
        scrollTrigger: {
          trigger: headerContainer,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (eyebrowSplitData.shouldSplit) {
            eyebrowSplitData.splits.forEach(split => split.revert());
            headingSplitData.splits.forEach(split => split.revert());
            headerParagraphSplitData.splits.forEach(split => split.revert());
            paragraphSplitData.splits.forEach(split => split.revert());
          }

          scheduleScrollTriggerRefresh(true);
        }
      });

      animateText(splitScrollLockTL, {
        elements: eyebrows,
        lines: eyebrowSplitData.lines,
        shouldSplit: eyebrowSplitData.shouldSplit,
        yPercent: paragraphYPercent,
        y: paragraphY,
        position: 0,
        duration: 0.8
      });

      animateText(splitScrollLockTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: defaultPosition,
        duration: 1.25
      });

      animateText(splitScrollLockTL, {
        elements: headerParagraphs,
        lines: headerParagraphSplitData.lines,
        shouldSplit: headerParagraphSplitData.shouldSplit,
        yPercent: paragraphYPercentNoMask,
        y: paragraphY,
        position: defaultPosition,
        duration: 1
      });

      if (imageContainer) {
        splitScrollLockTL.fromTo(imageContainer, {
          opacity: 0
        },
          {
            opacity: 1,
            duration: 1.25,
            ease: defaultEasingOut
          }, ">-0.75");
      }

      // if (imageContainer) {
      //   splitScrollLockTL.fromTo(imageContainer, {
      //     clipPath: imageMaskedSwipeStart
      //   },
      //   {
      //     clipPath: imageMaskedSwipeEnd,
      //     duration: 2,
      //     ease: defaultEasingInOut,
      //   }, defaultPosition);
      // }

      animateText(splitScrollLockTL, {
        elements: paragraphs,
        lines: paragraphSplitData.lines,
        shouldSplit: paragraphSplitData.shouldSplit,
        yPercent: paragraphYPercentNoMask,
        y: paragraphY,
        position: "<0.5",
        duration: 1
      });

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
          }, ">-1");
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

    createAnimation();
  });
}

// Icon Grid Component - GSAP Reveals
function iconGridComponent() {
  const components = document.querySelectorAll('.icon-grid_wrap');

  components.forEach(component => {
    const container = component.querySelector('.icon-grid_contain');
    const headings = component.querySelectorAll('.icon-grid_header_wrap .c-heading');
    const paragraphs = component.querySelectorAll('.icon-grid_header_wrap .c-paragraph > *');
    const items = component.querySelectorAll('.icon-grid_item');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const headingSplitData = createTextSplits(headings);
    // const paragraphSplitData = createTextSplits(paragraphs);
    const paragraphSplitData = createTextSplits(paragraphs, { mask: false });

    let iconGridComponentTL;

    function createAnimation() {
      if (iconGridComponentTL) {
        iconGridComponentTL.kill();
      }

      iconGridComponentTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (headingSplitData.shouldSplit) {
            headingSplitData.splits.forEach(s => s.revert());
          }
          if (paragraphSplitData.shouldSplit) {
            paragraphSplitData.splits.forEach(s => s.revert());
          }

          scheduleScrollTriggerRefresh();
        }
      });

      animateText(iconGridComponentTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: 0,
        duration: 1.25
      });

      animateText(iconGridComponentTL, {
        elements: paragraphs,
        lines: paragraphSplitData.lines,
        shouldSplit: paragraphSplitData.shouldSplit,
        yPercent: paragraphYPercentNoMask,
        y: paragraphY,
        position: ">-0.75",
        duration: 1
      });

      items.forEach(item => {
        const itemHeader = item.querySelectorAll('.icon-grid_item_header');
        const itemHeadings = item.querySelectorAll('.icon-grid_item_label');
        const itemIcons = item.querySelectorAll('.icon-grid_item_icon_wrap');
        const itemParagraphs = item.querySelectorAll('.c-paragraph > *');

        const itemHeadingSplitData = createTextSplits(itemHeadings);
        // const itemParagraphSplitData = createTextSplits(itemParagraphs);
        const itemParagraphSplitData = createTextSplits(itemParagraphs, { mask: false });

        if (itemHeader.length > 0) {
          iconGridComponentTL.fromTo(itemHeader, {
            opacity: 0
          },
            {
              opacity: 1,
              duration: 1,
              ease: defaultEasingOut,
              stagger: defaultStagger
            }, ">-1");
        }

        animateText(iconGridComponentTL, {
          elements: itemHeadings,
          lines: itemHeadingSplitData.lines,
          shouldSplit: itemHeadingSplitData.shouldSplit,
          position: ">-1",
          duration: 1,
          toVars: {
            onComplete: () => {
              if (itemHeadingSplitData.shouldSplit) {
                itemHeadingSplitData.splits.forEach(split => split.revert());
              }
            }
          }
        });

        if (itemIcons.length > 0) {
          iconGridComponentTL.fromTo(itemIcons, {
            opacity: 0
          },
            {
              opacity: 1,
              duration: 1,
              ease: defaultEasingOut,
              stagger: defaultStagger
            }, ">-1");
        }

        animateText(iconGridComponentTL, {
          elements: itemParagraphs,
          lines: itemParagraphSplitData.lines,
          shouldSplit: itemParagraphSplitData.shouldSplit,
          yPercent: paragraphYPercentNoMask,
          y: paragraphY,
          position: ">-0.75",
          duration: 1,
          toVars: {
            onComplete: () => {
              if (itemParagraphSplitData.shouldSplit) {
                itemParagraphSplitData.splits.forEach(split => split.revert());
              }
            }
          }
        });
      })
    }

    createAnimation();
  });
}

// Featured (Related) Work Component - GSAP Reveals
function featuredWorkComponent() {
  const components = document.querySelectorAll('.work-related_wrap');

  components.forEach(component => {
    const container = component.querySelector('.work-related_contain');
    const headings = container.querySelectorAll('.work-related_heading, .work-related_grid_headline');
    const items = component.querySelectorAll('.work-related_collection_item');
    const buttons = component.querySelectorAll('.button_main_wrap');
    const buttonsWrap = component.querySelector('.work-related_grid_button_wrap');

    if (shouldSkipAnimation(container)) {
      container.querySelectorAll('[data-gsap-hide]').forEach(item => item.removeAttribute('data-gsap-hide'));
    } else {
      const headingSplitData = createTextSplits(headings);

      const headerTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          container.querySelectorAll('[data-gsap-hide]').forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (headingSplitData.shouldSplit) {
            headingSplitData.splits.forEach(split => split.revert());
          }
          scheduleScrollTriggerRefresh(true);
        }
      });

      animateText(headerTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: 0,
        duration: 1.25,
        stagger: (defaultStagger * 5)
      });
    }

    items.forEach((item, index) => {
      if (shouldSkipAnimation(item)) {
        item.querySelectorAll('[data-gsap-hide]').forEach(el => el.removeAttribute('data-gsap-hide'));
        return;
      }

      const itemTitle = item.querySelector('.work-related_collection_item_content_title');
      const imageWrap = item.querySelector('.work-related_collection_item_image_wrap');
      const image = item.querySelector('.work-related_collection_item_image');
      const accentImage = item.querySelector('.work-related_collection_item_image_accent_wrap');
      const hoverStuff = item.querySelectorAll('.work-sl_collection_item_content_info_wrap > *, .work-sl_collection_item_content_title_icon_wrap > *');
      const hiddenItems = item.querySelectorAll('[data-gsap-hide]');

      // Create split for this item's title
      const itemTitleSplitData = createTextSplits(itemTitle ? [itemTitle] : []);

      // Calculate delay based on grid position (2 columns on desktop only)
      const isTwoColumn = window.innerWidth > 550;
      const columnIndex = isTwoColumn ? index % 2 : 0;
      const staggerDelay = columnIndex * defaultStagger * 5;

      const itemTL = gsap.timeline({
        scrollTrigger: {
          trigger: item,
          start: getAnimationStart(),
          once: true
        },
        delay: staggerDelay,
        onStart: () => {
          hiddenItems.forEach(el => el.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (itemTitleSplitData.shouldSplit) {
            itemTitleSplitData.splits.forEach(split => split.revert());
          }
          scheduleScrollTriggerRefresh(true);
        }
      });

      if (image) {
        itemTL.fromTo(image, {
          clipPath: imageMaskedSwipeStart
        },
          {
            clipPath: imageMaskedSwipeEnd,
            duration: 1.75,
            ease: defaultEasingOut
          }, 0);
      }

      if (imageWrap) {
        itemTL.fromTo(imageWrap, {
          backgroundColor: 'transparent'
        },
          {
            backgroundColor: 'var(--swatch--dark-900)',
            duration: 0.5,
            ease: defaultEasingOut
          }, "<1.25");
      }

      if (accentImage) {
        itemTL.fromTo(accentImage, {
          opacity: 0
        },
          {
            opacity: 1,
            duration: 0.5,
            ease: defaultEasingOut
          }, "<0.25");
      }

      if (itemTitle) {
        animateText(itemTL, {
          elements: [itemTitle],
          lines: itemTitleSplitData.lines,
          shouldSplit: itemTitleSplitData.shouldSplit,
          position: "<-1",
          duration: 1.25
        });
      }

      if (hoverStuff.length > 0) {
        itemTL.fromTo(hoverStuff, {
          opacity: 0
        },
          {
            opacity: 1,
            duration: 1,
            ease: defaultEasingOut
          }, ">-1");
      }
    });

    if (shouldSkipAnimation(buttonsWrap)) {
      return;
    }

    if (buttons.length > 0) {
      const buttonsTL = gsap.timeline({
        scrollTrigger: {
          trigger: buttonsWrap,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          buttons.forEach(btn => btn.removeAttribute('data-gsap-hide'));
        }
      });

      buttonsTL.fromTo(buttons, {
        yPercent: buttonsYPercent,
        opacity: 0,
      },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        }, 0);
    }
  });
}

// Testimonial Component - GSAP Reveals
function testimonialComponent() {
  const components = document.querySelectorAll('.testimonial_wrap');

  components.forEach(component => {
    const container = component.querySelector('.testimonial_contain');
    const graphics = component.querySelectorAll('.testimonial_graphics_wrap > *');
    const paragraphs = component.querySelectorAll('.testimonial_content_name, .testimonial_content_info_wrap, .testimonial_content .c-paragraph > *');
    const buttons = component.querySelectorAll('.button_main_wrap');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    // const paragraphSplitData = createTextSplits(paragraphs);
    const paragraphSplitData = createTextSplits(paragraphs, { mask: false });

    let testimonialComponentTL;

    function createAnimation() {
      if (testimonialComponentTL) {
        testimonialComponentTL.kill();
      }

      testimonialComponentTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (paragraphSplitData.shouldSplit) {
            paragraphSplitData.splits.forEach(split => split.revert());
          }

          scheduleScrollTriggerRefresh();
        }
      });

      // if (graphics.length > 0) {
      //   testimonialComponentTL.fromTo(graphics, {
      //     yPercent: 50,
      //     opacity: 0
      //   },
      //   {
      //     yPercent: 0,
      //     opacity: 1,
      //     duration: 1,
      //     ease: defaultEasingOut,
      //     stagger: (defaultStagger * 2)
      //   }, 0);
      // }

      if (graphics.length > 0) {
        testimonialComponentTL.fromTo(graphics, {
          clipPath: imageMaskedSwipeStart
        },
          {
            clipPath: imageMaskedSwipeEnd,
            duration: 1.5,
            ease: defaultEasingOut,
            stagger: (defaultStagger * 2.5)
          }, 0);
      }

      animateText(testimonialComponentTL, {
        elements: paragraphs,
        lines: paragraphSplitData.lines,
        shouldSplit: paragraphSplitData.shouldSplit,
        yPercent: paragraphYPercentNoMask,
        y: paragraphY,
        position: "<0.75",
        duration: 1
      });

      if (buttons.length > 0) {
        testimonialComponentTL.fromTo(buttons, {
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

    createAnimation();
  });
}

// Compass CTA Component - GSAP Reveals
function compassCTAComponent() {
  const components = document.querySelectorAll('.compass-cta_wrap');

  components.forEach(component => {
    const container = component.querySelector('.compass-cta_contain');
    const headings = component.querySelectorAll('.compass-cta_content_wrap .c-heading');
    const paragraphs = component.querySelectorAll('.compass-cta_content_wrap .c-paragraph > *');
    const buttons = component.querySelectorAll('.button_main_wrap');
    const image = component.querySelector('.compass-cta_media_svg');
    const shape = component.querySelector('.compass-cta_corner-block');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const headingSplitData = createTextSplits(headings);
    // const paragraphSplitData = createTextSplits(paragraphs);
    const paragraphSplitData = createTextSplits(paragraphs, { mask: false });

    let compassCTAComponentTL;

    function createAnimation() {
      if (compassCTAComponentTL) {
        compassCTAComponentTL.kill();
      }

      compassCTAComponentTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (headingSplitData.shouldSplit) {
            headingSplitData.splits.forEach(s => s.revert());
          }
          if (paragraphSplitData.shouldSplit) {
            paragraphSplitData.splits.forEach(s => s.revert());
          }

          scheduleScrollTriggerRefresh();
        }
      });

      animateText(compassCTAComponentTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: 0,
        duration: 1.25
      });

      animateText(compassCTAComponentTL, {
        elements: paragraphs,
        lines: paragraphSplitData.lines,
        shouldSplit: paragraphSplitData.shouldSplit,
        yPercent: paragraphYPercentNoMask,
        y: paragraphY,
        position: ">-0.75",
        duration: 1
      });

      if (buttons.length > 0) {
        compassCTAComponentTL.fromTo(buttons, {
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

      if (image) {
        compassCTAComponentTL.fromTo(image, {
          opacity: 0
        },
          {
            opacity: 1,
            duration: 1.25,
            ease: defaultEasingOut
          }, 0.5);
      }

      // if (shape) {
      //   compassCTAComponentTL.fromTo(shape, {
      //     opacity: 0
      //   },
      //   {
      //     opacity: 1,
      //     duration: 0.8,
      //     ease: defaultEasingOut
      //   }, defaultPosition);
      // }

      if (shape) {
        compassCTAComponentTL.fromTo(shape, {
          clipPath: imageMaskedSwipeStart
        },
          {
            clipPath: imageMaskedSwipeEnd,
            duration: 1.75,
            ease: defaultEasingOut
          }, defaultPosition);
      }
    }

    createAnimation();
  });
}

// Split Panel with Image Array Component - GSAP Reveals
function splitPanelImageArrayComponent() {
  const components = document.querySelectorAll('.split-panel-image-array_wrap');

  components.forEach(component => {
    const container = component.querySelector('.split-panel-image-array_contain');
    const headings = component.querySelectorAll('.split-panel-image-array_content_wrap .c-heading');
    const paragraphs = component.querySelectorAll('.split-panel-image-array_content_wrap .c-paragraph > *');
    const buttons = component.querySelectorAll('.split-panel-image-array_content_wrap .button_main_wrap');
    const graphics = component.querySelectorAll('.split-panel-image-array_images_array_wrap > *');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const headingSplitData = createTextSplits(headings);
    // const paragraphSplitData = createTextSplits(paragraphs);
    const paragraphSplitData = createTextSplits(paragraphs, { mask: false });

    let splitPanelImageArrayTL;

    function createAnimation() {
      if (splitPanelImageArrayTL) {
        splitPanelImageArrayTL.kill();
      }

      splitPanelImageArrayTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (headingSplitData.shouldSplit) {
            headingSplitData.splits.forEach(s => s.revert());
          }
          if (paragraphSplitData.shouldSplit) {
            paragraphSplitData.splits.forEach(s => s.revert());
          }

          scheduleScrollTriggerRefresh(true);
        }
      });

      // if (graphics.length > 0) {
      //   splitPanelImageArrayTL.fromTo(graphics, {
      //     yPercent: 50,
      //     opacity: 0
      //   },
      //   {
      //     yPercent: 0,
      //     opacity: 1,
      //     duration: 1,
      //     ease: defaultEasingOut,
      //     stagger: (defaultStagger * 2)
      //   }, 0);
      // }

      if (graphics.length > 0) {
        splitPanelImageArrayTL.fromTo(graphics, {
          clipPath: imageMaskedSwipeStart
        },
          {
            clipPath: imageMaskedSwipeEnd,
            duration: 1.5,
            ease: defaultEasingOut,
            stagger: (defaultStagger * 2.5)
          }, 0);
      }

      animateText(splitPanelImageArrayTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: ">-1",
        duration: 1.25
      });

      animateText(splitPanelImageArrayTL, {
        elements: paragraphs,
        lines: paragraphSplitData.lines,
        shouldSplit: paragraphSplitData.shouldSplit,
        yPercent: paragraphYPercentNoMask,
        y: paragraphY,
        position: ">-0.75",
        duration: 1
      });

      if (buttons.length > 0) {
        splitPanelImageArrayTL.fromTo(buttons, {
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

    createAnimation();
  });
}

// Compass Form Component - GSAP Reveals
function compassFormComponent() {
  const components = document.querySelectorAll('.compass-form_wrap');

  components.forEach(component => {
    const container = component.querySelector('.compass-form_contain');
    const headings = component.querySelectorAll('.compass-form_content_wrap .c-heading');
    const paragraphs = component.querySelectorAll('.compass-form_content_wrap .c-paragraph > *');
    const formFields = component.querySelectorAll('.form_main_label_wrap');
    const buttons = component.querySelectorAll('.button_main_wrap');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const headingSplitData = createTextSplits(headings);
    // const paragraphSplitData = createTextSplits(paragraphs);
    const paragraphSplitData = createTextSplits(paragraphs, { mask: false });

    let compassFormComponentTL;

    function createAnimation() {
      if (compassFormComponentTL) {
        compassFormComponentTL.kill();
      }

      compassFormComponentTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (headingSplitData.shouldSplit) {
            headingSplitData.splits.forEach(s => s.revert());
          }
          if (paragraphSplitData.shouldSplit) {
            paragraphSplitData.splits.forEach(s => s.revert());
          }

          scheduleScrollTriggerRefresh(true);
        }
      });

      animateText(compassFormComponentTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: 0,
        duration: 1.25
      });

      animateText(compassFormComponentTL, {
        elements: paragraphs,
        lines: paragraphSplitData.lines,
        shouldSplit: paragraphSplitData.shouldSplit,
        yPercent: paragraphYPercentNoMask,
        y: paragraphY,
        position: ">-0.75",
        duration: 1
      });

      formFields.forEach(field => {
        const fieldLabels = field.querySelectorAll('.form_main_label_text');
        const fieldInput = field.querySelector('.form_main_select_wrap');

        const fieldLabelSplitData = createTextSplits(fieldLabels);

        animateText(compassFormComponentTL, {
          elements: fieldLabels,
          lines: fieldLabelSplitData.lines,
          shouldSplit: fieldLabelSplitData.shouldSplit,
          position: ">-0.75",
          duration: 1,
          toVars: {
            onComplete: () => {
              if (fieldLabelSplitData.shouldSplit) {
                fieldLabelSplitData.splits.forEach(split => split.revert());
              }
            }
          }
        });

        if (fieldInput) {
          compassFormComponentTL.fromTo(fieldInput, {
            yPercent: 50,
            opacity: 0
          },
            {
              yPercent: 0,
              opacity: 1,
              duration: 1,
              ease: defaultEasingOut
            }, ">-0.6");
        }
      });

      if (buttons.length > 0) {
        compassFormComponentTL.fromTo(buttons, {
          yPercent: buttonsYPercent,
          opacity: 0,
        },
          {
            yPercent: 0,
            opacity: 1,
            duration: 1,
            ease: defaultEasingOut,
            stagger: defaultStagger
          }, ">-0.6");
      }
    }

    createAnimation();
  });
}

// Cultural Impact Component - GSAP Reveals
function culturalImpactComponent() {
  const components = document.querySelectorAll('.culture_wrap');

  components.forEach(component => {
    const headerContainer = component.querySelector('.culture_content_wrap');
    const headerHeadings = headerContainer.querySelectorAll('.c-heading');
    const headerParagraphs = headerContainer.querySelectorAll('.c-paragraph > *');

    const podcastContainer = component.querySelector('.culture_grid_podcast_wrap');
    const podcastImage = podcastContainer.querySelector('.culture_grid_podcast_image');
    const podcastHeadings = podcastContainer.querySelectorAll('.c-heading');
    const podcastParagraphs = podcastContainer.querySelectorAll('.c-paragraph > *');
    const podcastButtons = podcastContainer.querySelectorAll('.button_main_wrap');

    const noLogoContainer = component.querySelector('.culture_grid_no-logo_wrap');
    const noLogoImage = noLogoContainer.querySelector('.culture_grid_no-logo_image');
    const noLogoHeadings = noLogoContainer.querySelectorAll('.c-heading');
    const noLogoParagraphs = noLogoContainer.querySelectorAll('.c-paragraph > *');
    const noLogoButtons = noLogoContainer.querySelectorAll('.button_main_wrap');

    // Header animation
    if (shouldSkipAnimation(headerContainer)) {
      headerContainer.querySelectorAll('[data-gsap-hide]').forEach(item => item.removeAttribute('data-gsap-hide'));
    } else {
      const headerHeadingSplitData = createTextSplits(headerHeadings);
      // const headerParagraphSplitData = createTextSplits(headerParagraphs);
      const headerParagraphSplitData = createTextSplits(headerParagraphs, { mask: false });

      const headerTL = gsap.timeline({
        scrollTrigger: {
          trigger: headerContainer,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          headerContainer.querySelectorAll('[data-gsap-hide]').forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (headerHeadingSplitData.shouldSplit) {
            headerHeadingSplitData.splits.forEach(split => split.revert());
            headerParagraphSplitData.splits.forEach(split => split.revert());
          }
          scheduleScrollTriggerRefresh();
        }
      });

      animateText(headerTL, {
        elements: headerHeadings,
        lines: headerHeadingSplitData.lines,
        shouldSplit: headerHeadingSplitData.shouldSplit,
        position: 0,
        duration: 1.25
      });

      animateText(headerTL, {
        elements: headerParagraphs,
        lines: headerParagraphSplitData.lines,
        shouldSplit: headerParagraphSplitData.shouldSplit,
        yPercent: paragraphYPercentNoMask,
        y: paragraphY,
        position: ">-0.75",
        duration: 1
      });
    }

    // Podcast animation
    if (shouldSkipAnimation(podcastContainer)) {
      podcastContainer.querySelectorAll('[data-gsap-hide]').forEach(item => item.removeAttribute('data-gsap-hide'));
    } else {
      const podcastHeadingSplitData = createTextSplits(podcastHeadings);
      // const podcastParagraphSplitData = createTextSplits(podcastParagraphs);
      const podcastParagraphSplitData = createTextSplits(podcastParagraphs, { mask: false });

      const podcastTL = gsap.timeline({
        scrollTrigger: {
          trigger: podcastContainer,
          start: getAnimationStart(30, 50),
          once: true
        },
        onStart: () => {
          podcastContainer.querySelectorAll('[data-gsap-hide]').forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (podcastHeadingSplitData.shouldSplit) {
            podcastHeadingSplitData.splits.forEach(split => split.revert());
            podcastParagraphSplitData.splits.forEach(split => split.revert());
          }
          scheduleScrollTriggerRefresh();
        }
      });

      // if (podcastImage) {
      //   podcastTL.fromTo(podcastImage, {
      //     yPercent: 15,
      //     opacity: 0
      //   },
      //   {
      //     yPercent: 0,
      //     opacity: 1,
      //     duration: 1,
      //     ease: defaultEasingOut
      //   }, 0);
      // }

      if (podcastImage) {
        podcastTL.fromTo(podcastImage, {
          clipPath: imageMaskedSwipeStart
        },
          {
            clipPath: imageMaskedSwipeEnd,
            duration: 1.75,
            ease: defaultEasingOut
          }, 0);
      }

      animateText(podcastTL, {
        elements: podcastHeadings,
        lines: podcastHeadingSplitData.lines,
        shouldSplit: podcastHeadingSplitData.shouldSplit,
        position: defaultPosition,
        duration: 1.25
      });

      animateText(podcastTL, {
        elements: podcastParagraphs,
        lines: podcastParagraphSplitData.lines,
        shouldSplit: podcastParagraphSplitData.shouldSplit,
        yPercent: paragraphYPercentNoMask,
        y: paragraphY,
        position: ">-0.75",
        duration: 1
      });

      if (podcastButtons.length > 0) {
        podcastTL.fromTo(podcastButtons, {
          yPercent: buttonsYPercent,
          opacity: 0,
        },
          {
            yPercent: 0,
            opacity: 1,
            duration: 1,
            ease: defaultEasingOut,
            stagger: defaultStagger
          }, ">-0.75");
      }
    }

    // NoLogo animation
    if (shouldSkipAnimation(noLogoContainer)) {
      noLogoContainer.querySelectorAll('[data-gsap-hide]').forEach(item => item.removeAttribute('data-gsap-hide'));
    } else {
      const noLogoHeadingSplitData = createTextSplits(noLogoHeadings);
      // const noLogoParagraphSplitData = createTextSplits(noLogoParagraphs);
      const noLogoParagraphSplitData = createTextSplits(noLogoParagraphs, { mask: false });

      const noLogoTL = gsap.timeline({
        scrollTrigger: {
          trigger: noLogoContainer,
          start: getAnimationStart(30, 50),
          once: true
        },
        onStart: () => {
          noLogoContainer.querySelectorAll('[data-gsap-hide]').forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (noLogoHeadingSplitData.shouldSplit) {
            noLogoHeadingSplitData.splits.forEach(split => split.revert());
            noLogoParagraphSplitData.splits.forEach(split => split.revert());
          }
          scheduleScrollTriggerRefresh();
        }
      });

      // if (noLogoImage) {
      //   noLogoTL.fromTo(noLogoImage, {
      //     yPercent: 15,
      //     opacity: 0
      //   },
      //   {
      //     yPercent: 0,
      //     opacity: 1,
      //     duration: 1,
      //     ease: defaultEasingOut
      //   }, 0);
      // }

      if (noLogoImage) {
        noLogoTL.fromTo(noLogoImage, {
          clipPath: imageMaskedSwipeStart
        },
          {
            clipPath: imageMaskedSwipeEnd,
            duration: 1.75,
            ease: defaultEasingOut
          }, 0);
      }

      animateText(noLogoTL, {
        elements: noLogoHeadings,
        lines: noLogoHeadingSplitData.lines,
        shouldSplit: noLogoHeadingSplitData.shouldSplit,
        position: defaultPosition,
        duration: 1.25
      });

      animateText(noLogoTL, {
        elements: noLogoParagraphs,
        lines: noLogoParagraphSplitData.lines,
        shouldSplit: noLogoParagraphSplitData.shouldSplit,
        yPercent: paragraphYPercentNoMask,
        y: paragraphY,
        position: ">-0.75",
        duration: 1
      });

      if (noLogoButtons.length > 0) {
        noLogoTL.fromTo(noLogoButtons, {
          yPercent: buttonsYPercent,
          opacity: 0,
        },
          {
            yPercent: 0,
            opacity: 1,
            duration: 1,
            ease: defaultEasingOut,
            stagger: defaultStagger
          }, ">-0.75");
      }
    }
  });
}

// Podcast List Component - GSAP Reveals
function podcastListComponent() {
  const components = document.querySelectorAll('.podcast-list_wrap');

  components.forEach(component => {
    const container = component.querySelector('.podcast-list_contain');
    const footerContainer = component.querySelector('.podcast-list_list_sub_wrap');

    // Animate main container (only on first load)
    if (!container.hasAttribute('data-gsap-initialized')) {
      container.setAttribute('data-gsap-initialized', 'true');

      if (shouldSkipAnimation(container)) {
        container.querySelectorAll('[data-gsap-hide]').forEach(item => item.removeAttribute('data-gsap-hide'));
      } else {
        const headings = component.querySelectorAll('.podcast-list_list_inner > .c-heading');
        const buttons = component.querySelectorAll('.button_main_wrap');
        const headingSplitData = createTextSplits(headings);

        const podcastListComponentTL = gsap.timeline({
          scrollTrigger: {
            trigger: container,
            start: getAnimationStart(),
            once: true
          },
          onStart: () => {
            container.querySelectorAll(':not(.podcast-list_list_sub_wrap) [data-gsap-hide]').forEach(item => item.removeAttribute('data-gsap-hide'));
          },
          onComplete: () => {
            if (headingSplitData.shouldSplit) {
              headingSplitData.splits.forEach(split => split.revert());
            }
            scheduleScrollTriggerRefresh(true);
          }
        });

        animateText(podcastListComponentTL, {
          elements: headings,
          lines: headingSplitData.lines,
          shouldSplit: headingSplitData.shouldSplit,
          position: 0,
          duration: 1.25
        });

        if (buttons.length > 0) {
          podcastListComponentTL.fromTo(buttons, {
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
    }

    // Animate NEW episode items (runs on initial load AND after load more)
    const episodeItems = component.querySelectorAll('.podcast-list_list_item:not([data-gsap-initialized]) .podcast-list_list_item_link');

    if (episodeItems.length > 0) {
      // Mark parent items as initialized
      episodeItems.forEach(link => {
        const listItem = link.closest('.podcast-list_list_item');
        listItem.setAttribute('data-gsap-initialized', 'true');
        link.removeAttribute('data-gsap-hide');
      });

      // Animate new items
      gsap.fromTo(episodeItems, {
        yPercent: 50,
        opacity: 0
      },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
          stagger: defaultStagger
        });
    }

    // Animate footer (only on first load)
    if (!footerContainer || footerContainer.hasAttribute('data-gsap-initialized')) return;

    footerContainer.setAttribute('data-gsap-initialized', 'true');

    if (shouldSkipAnimation(footerContainer)) {
      footerContainer.querySelectorAll('[data-gsap-hide]').forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const footerHeadings = footerContainer.querySelectorAll('.podcast-list_list_sub_content_wrap .c-heading');
    const footerParagraphs = footerContainer.querySelectorAll('.podcast-list_list_sub_content_wrap .c-paragraph > *');
    const footerSignup = footerContainer.querySelector('.podcast-list_list_sub_form_wrap');

    const footerHeadingSplitData = createTextSplits(footerHeadings);
    // const footerParagraphSplitData = createTextSplits(footerParagraphs);
    const footerParagraphSplitData = createTextSplits(footerParagraphs, { mask: false });

    const footerTL = gsap.timeline({
      scrollTrigger: {
        trigger: footerContainer,
        start: getAnimationStart(),
        once: true
      },
      onStart: () => {
        footerContainer.querySelectorAll('[data-gsap-hide]').forEach(item => item.removeAttribute('data-gsap-hide'));
      },
      onComplete: () => {
        if (footerHeadingSplitData.shouldSplit) {
          footerHeadingSplitData.splits.forEach(split => split.revert());
          footerParagraphSplitData.splits.forEach(split => split.revert());
        }
        scheduleScrollTriggerRefresh();
      }
    });

    animateText(footerTL, {
      elements: footerHeadings,
      lines: footerHeadingSplitData.lines,
      shouldSplit: footerHeadingSplitData.shouldSplit,
      position: 0,
      duration: 1.25
    });

    animateText(footerTL, {
      elements: footerParagraphs,
      lines: footerParagraphSplitData.lines,
      shouldSplit: footerParagraphSplitData.shouldSplit,
      yPercent: paragraphYPercentNoMask,
      y: paragraphY,
      position: ">-0.75",
      duration: 1
    });

    if (footerSignup) {
      footerTL.fromTo(footerSignup, {
        yPercent: 50,
        opacity: 0,
      },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: defaultEasingOut,
        }, defaultPosition);
    }
  });
}

// Stat Grid Component - GSAP Reveals
function statGridComponent() {
  const components = document.querySelectorAll('.stat-grid_wrap');

  components.forEach((component, index) => {
    const container = component.querySelector('.stat-grid_contain');
    const headings = component.querySelectorAll('.stat-grid_heading_wrap .c-heading');
    const paragraphs = component.querySelectorAll('.stat-grid_heading_wrap .c-paragraph > *');
    const items = component.querySelectorAll('.stat-grid_item');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const headingSplitData = createTextSplits(headings);
    // const paragraphSplitData = createTextSplits(paragraphs);
    const paragraphSplitData = createTextSplits(paragraphs, { mask: false });

    let statGridComponentTL;

    function createAnimation() {
      if (statGridComponentTL) {
        statGridComponentTL.kill();
      }

      statGridComponentTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (headingSplitData.shouldSplit) {
            headingSplitData.splits.forEach(s => s.revert());
          }
          if (paragraphSplitData.shouldSplit) {
            paragraphSplitData.splits.forEach(s => s.revert());
          }

          scheduleScrollTriggerRefresh(true);
        }
      });

      animateText(statGridComponentTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: 0,
        duration: 1.25
      });

      animateText(statGridComponentTL, {
        elements: paragraphs,
        lines: paragraphSplitData.lines,
        shouldSplit: paragraphSplitData.shouldSplit,
        yPercent: paragraphYPercentNoMask,
        y: paragraphY,
        position: ">-0.75",
        duration: 1
      });

      items.forEach(item => {
        const itemHeader = item.querySelectorAll('.stat-grid_item_header');
        const itemHeadings = item.querySelectorAll('.stat-grid_item_label');
        const itemStats = item.querySelectorAll('.stat-grid_item_value_wrap');
        const itemParagraphs = item.querySelectorAll('.c-paragraph > *');

        const itemHeadingSplitData = createTextSplits(itemHeadings);
        // const itemStatSplitData = createTextSplits(itemStats);
        // const itemParagraphSplitData = createTextSplits(itemParagraphs);
        const itemParagraphSplitData = createTextSplits(itemParagraphs, { mask: false });

        if (itemHeader.length > 0) {
          statGridComponentTL.fromTo(itemHeader, {
            opacity: 0
          },
            {
              opacity: 1,
              duration: 1,
              ease: defaultEasingOut,
              stagger: defaultStagger
            }, ">-1");
        }

        animateText(statGridComponentTL, {
          elements: itemHeadings,
          lines: itemHeadingSplitData.lines,
          shouldSplit: itemHeadingSplitData.shouldSplit,
          position: ">-1",
          duration: 1,
          toVars: {
            onComplete: () => {
              if (itemHeadingSplitData.shouldSplit) {
                itemHeadingSplitData.splits.forEach(split => split.revert());
              }
            }
          }
        });

        if (itemStats.length > 0) {
          statGridComponentTL.fromTo(itemStats, {
            yPercent: headingYPercent,
            opacity: 0
          },
            {
              yPercent: 0,
              opacity: 1,
              duration: 1,
              ease: defaultEasingOut,
              stagger: defaultStagger
            }, ">-1");
        }

        // Note: Don't revert stat splits as odometer needs DOM structure intact
        // animateText(statGridComponentTL, {
        //   elements: itemStats,
        //   lines: itemStatSplitData.lines,
        //   shouldSplit: itemStatSplitData.shouldSplit,
        //   position: ">-1",
        //   duration: 1
        // });

        animateText(statGridComponentTL, {
          elements: itemParagraphs,
          lines: itemParagraphSplitData.lines,
          shouldSplit: itemParagraphSplitData.shouldSplit,
          yPercent: paragraphYPercentNoMask,
          y: paragraphY,
          position: ">-0.75",
          duration: 1,
          toVars: {
            onComplete: () => {
              if (itemParagraphSplitData.shouldSplit) {
                itemParagraphSplitData.splits.forEach(split => split.revert());
              }
            }
          }
        });
      })
    }

    createAnimation();
  });
}

// Offices Component - GSAP Reveals
function officesComponent() {
  const components = document.querySelectorAll('.offices_wrap');

  components.forEach(component => {
    const container = component.querySelector('.offices_contain');
    const headings = component.querySelectorAll('.offices_heading_wrap .c-heading, .offices-grid_text_subheading');
    const paragraphs = component.querySelectorAll('.offices_text_wrap .c-paragraph > *');
    const image = component.querySelector('.offices_image');
    const buttons = component.querySelectorAll('.button_main_wrap');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const headingSplitData = createTextSplits(headings);
    // const paragraphSplitData = createTextSplits(paragraphs);
    const paragraphSplitData = createTextSplits(paragraphs, { mask: false });

    let officesComponentTL;

    function createAnimation() {
      if (officesComponentTL) {
        officesComponentTL.kill();
      }

      officesComponentTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (headingSplitData.shouldSplit) {
            headingSplitData.splits.forEach(s => s.revert());
          }
          if (paragraphSplitData.shouldSplit) {
            paragraphSplitData.splits.forEach(s => s.revert());
          }

          scheduleScrollTriggerRefresh();
        }
      });

      animateText(officesComponentTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: 0,
        duration: 1.25
      });

      animateText(officesComponentTL, {
        elements: paragraphs,
        lines: paragraphSplitData.lines,
        shouldSplit: paragraphSplitData.shouldSplit,
        yPercent: paragraphYPercentNoMask,
        y: paragraphY,
        position: ">-0.75",
        duration: 1
      });

      // if (image) {
      //   officesComponentTL.fromTo(image, {
      //     yPercent: 25,
      //     opacity: 0,
      //   },
      //   {
      //     yPercent: 0,
      //     opacity: 1,
      //     duration: 1,
      //     ease: defaultEasingOut
      //   }, defaultPosition);
      // }

      if (image) {
        officesComponentTL.fromTo(image, {
          clipPath: imageMaskedSwipeStart
        },
          {
            clipPath: imageMaskedSwipeEnd,
            duration: 3,
            ease: defaultEasingOut
          }, defaultPosition);
      }

      if (buttons.length > 0) {
        officesComponentTL.fromTo(buttons, {
          yPercent: buttonsYPercent,
          opacity: 0,
        },
          {
            yPercent: 0,
            opacity: 1,
            duration: 1,
            ease: defaultEasingOut,
            stagger: defaultStagger
          }, ">-0.6");
      }
    }

    createAnimation();
  });
}

// Two Image Slider Component - GSAP Reveals
function twoImageSliderComponent() {
  const components = document.querySelectorAll('.two-image-slider_wrap');

  components.forEach(component => {
    const container = component.querySelector('.two-image-slider_contain');
    const headings = component.querySelectorAll('.two-image-slider_heading_wrap .c-heading, .two-image-slider_text_swiper_heading');
    const paragraphs = component.querySelectorAll('.two-image-slider_text_wrap .c-paragraph > *, .two-image-slider_text_swiper_text *');
    // const swiperStuff = component.querySelectorAll('.two-image-slider_main_swiper, .two-image-slider_nav_wrap, .two-image-slider_secondary_swiper');
    const swipers = component.querySelectorAll('.two-image-slider_main_swiper, .two-image-slider_secondary_swiper');
    const swiperNav = component.querySelectorAll('.two-image-slider_nav_wrap');
    const buttons = component.querySelectorAll('.button_main_wrap');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const headingSplitData = createTextSplits(headings);
    // const paragraphSplitData = createTextSplits(paragraphs);
    const paragraphSplitData = createTextSplits(paragraphs, { mask: false });

    let twoImageSliderComponentTL;

    function createAnimation() {
      if (twoImageSliderComponentTL) {
        twoImageSliderComponentTL.kill();
      }

      twoImageSliderComponentTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (headingSplitData.shouldSplit) {
            headingSplitData.splits.forEach(s => s.revert());
          }
          if (paragraphSplitData.shouldSplit) {
            paragraphSplitData.splits.forEach(s => s.revert());
          }

          scheduleScrollTriggerRefresh(true);
        }
      });

      animateText(twoImageSliderComponentTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: 0,
        duration: 1.25,
        toVars: {
          stagger: 1
        }
      });

      animateText(twoImageSliderComponentTL, {
        elements: paragraphs,
        lines: paragraphSplitData.lines,
        shouldSplit: paragraphSplitData.shouldSplit,
        yPercent: paragraphYPercentNoMask,
        y: paragraphY,
        position: "<0.75",
        duration: 1
      });

      if (swipers.length > 0) {
        twoImageSliderComponentTL.fromTo(swipers, {
          clipPath: imageMaskedSwipeStart
        },
          {
            clipPath: imageMaskedSwipeEnd,
            duration: 1.75,
            ease: defaultEasingOut,
            stagger: defaultStagger * 5
          }, 1);
      }

      if (swiperNav.length > 0) {
        twoImageSliderComponentTL.fromTo(swiperNav, {
          yPercent: 100,
          opacity: 0
        },
          {
            yPercent: 0,
            opacity: 1,
            duration: 1,
            ease: defaultEasingOut,
            stagger: defaultStagger
          }, "<0.5");
      }

      if (buttons.length > 0) {
        twoImageSliderComponentTL.fromTo(buttons, {
          yPercent: buttonsYPercent,
          opacity: 0,
        },
          {
            yPercent: 0,
            opacity: 1,
            duration: 1,
            ease: defaultEasingOut,
            stagger: defaultStagger
          }, ">-0.6");
      }
    }

    createAnimation();
  });
}

// Accordion Section Component - GSAP Reveals
function accordionSectionComponent() {
  const components = document.querySelectorAll('.accordion-section_wrap');

  components.forEach(component => {
    const container = component.querySelector('.accordion-section_contain');
    const headings = component.querySelectorAll('.accordion-section_content_wrap .c-heading, .accordion-section_content_subheading');
    const paragraphs = component.querySelectorAll('.accordion-section_content_wrap .c-paragraph > *');
    const accordionItems = component.querySelectorAll('.accordion-section_accordion_item');
    const buttons = component.querySelectorAll('.button_main_wrap');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const headingSplitData = createTextSplits(headings);
    // const paragraphSplitData = createTextSplits(paragraphs);
    const paragraphSplitData = createTextSplits(paragraphs, { mask: false });

    let accordionSectionComponentTL;

    function createAnimation() {
      if (accordionSectionComponentTL) {
        accordionSectionComponentTL.kill();
      }

      accordionSectionComponentTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (headingSplitData.shouldSplit) {
            headingSplitData.splits.forEach(s => s.revert());
          }
          if (paragraphSplitData.shouldSplit) {
            paragraphSplitData.splits.forEach(s => s.revert());
          }

          scheduleScrollTriggerRefresh(true);
        }
      });

      animateText(accordionSectionComponentTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: 0,
        duration: 1.25
      });

      animateText(accordionSectionComponentTL, {
        elements: paragraphs,
        lines: paragraphSplitData.lines,
        shouldSplit: paragraphSplitData.shouldSplit,
        yPercent: paragraphYPercentNoMask,
        y: paragraphY,
        position: ">-0.75",
        duration: 1
      });

      if (accordionItems.length > 0) {
        accordionSectionComponentTL.fromTo(accordionItems, {
          yPercent: 40,
          opacity: 0
        },
          {
            yPercent: 0,
            opacity: 1,
            duration: 1,
            ease: defaultEasingOut,
            stagger: defaultStagger * 3
          }, ">-1");
      }

      if (buttons.length > 0) {
        accordionSectionComponentTL.fromTo(buttons, {
          yPercent: buttonsYPercent,
          opacity: 0,
        },
          {
            yPercent: 0,
            opacity: 1,
            duration: 1,
            ease: defaultEasingOut,
            stagger: defaultStagger
          }, ">-0.6");
      }
    }

    createAnimation();
  });
}

// Split Panel - Image Component - GSAP Reveals
function splitPanelImageComponent() {
  const components = document.querySelectorAll('.split-panel-image_wrap');

  components.forEach(component => {
    const container = component.querySelector('.split-panel-image_contain');
    const eyebrows = component.querySelectorAll('.split-panel-image_content_inner .eyebrow_text *');
    const headings = component.querySelectorAll('.split-panel-image_content_inner .c-heading, .accordion-section_content_subheading');
    const paragraphs = component.querySelectorAll('.split-panel-image_content_inner .c-paragraph > *');
    const image = component.querySelectorAll('.split-panel-image_image');
    const buttons = component.querySelectorAll('.button_main_wrap');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const eyebrowSplitData = createTextSplits(eyebrows);
    const headingSplitData = createTextSplits(headings);
    // const paragraphSplitData = createTextSplits(paragraphs);
    const paragraphSplitData = createTextSplits(paragraphs, { mask: false });

    let splitPanelImageComponentTL;

    function createAnimation() {
      if (splitPanelImageComponentTL) {
        splitPanelImageComponentTL.kill();
      }

      splitPanelImageComponentTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (eyebrowSplitData.shouldSplit) {
            eyebrowSplitData.splits.forEach(split => split.revert());
            headingSplitData.splits.forEach(split => split.revert());
            paragraphSplitData.splits.forEach(split => split.revert());
          }

          scheduleScrollTriggerRefresh();
        }
      });

      if (image) {
        splitPanelImageComponentTL.fromTo(image, {
          clipPath: imageMaskedSwipeStart
        },
          {
            clipPath: imageMaskedSwipeEnd,
            duration: 1.75,
            ease: defaultEasingOut
          }, getPosition(splitPanelImageComponentTL));
      }

      animateText(splitPanelImageComponentTL, {
        elements: eyebrows,
        lines: eyebrowSplitData.lines,
        shouldSplit: eyebrowSplitData.shouldSplit,
        yPercent: paragraphYPercent,
        y: paragraphY,
        position: 0.75,
        duration: 0.8
      });

      animateText(splitPanelImageComponentTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: 1,
        duration: 1.25
      });

      animateText(splitPanelImageComponentTL, {
        elements: paragraphs,
        lines: paragraphSplitData.lines,
        shouldSplit: paragraphSplitData.shouldSplit,
        yPercent: paragraphYPercentNoMask,
        y: paragraphY,
        position: ">-0.75",
        duration: 1
      });

      // if (image) {
      //   splitPanelImageComponentTL.fromTo(image, {
      //     opacity: 0
      //   },
      //   {
      //     opacity: 1,
      //     duration: 1.25,
      //     ease: defaultEasingOut
      //   }, 0.5);
      // }

      if (buttons.length > 0) {
        splitPanelImageComponentTL.fromTo(buttons, {
          yPercent: buttonsYPercent,
          opacity: 0,
        },
          {
            yPercent: 0,
            opacity: 1,
            duration: 1,
            ease: defaultEasingOut,
            stagger: defaultStagger
          }, ">-0.6");
      }
    }

    createAnimation();
  });
}

// Careers Component - GSAP Reveals
function careersComponent() {
  const components = document.querySelectorAll('.careers_wrap');

  components.forEach(component => {
    const container = component.querySelector('.careers_contain');
    const headings = component.querySelectorAll('.careers_heading_wrap .c-heading, .careers_content_subheading');
    const paragraphs = component.querySelectorAll('.careers_content_wrap .c-paragraph > *');
    const buttons = component.querySelectorAll('.button_main_wrap');
    const careersBoard = component.querySelector('.careers_board_wrap');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const headingSplitData = createTextSplits(headings);
    // const paragraphSplitData = createTextSplits(paragraphs);
    const paragraphSplitData = createTextSplits(paragraphs, { mask: false });

    let careersComponentTL;

    function createAnimation() {
      if (careersComponentTL) {
        careersComponentTL.kill();
      }

      careersComponentTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (headingSplitData.shouldSplit) {
            headingSplitData.splits.forEach(s => s.revert());
          }
          if (paragraphSplitData.shouldSplit) {
            paragraphSplitData.splits.forEach(s => s.revert());
          }

          scheduleScrollTriggerRefresh();
        }
      });

      animateText(careersComponentTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: 0,
        duration: 1.25
      });

      animateText(careersComponentTL, {
        elements: paragraphs,
        lines: paragraphSplitData.lines,
        shouldSplit: paragraphSplitData.shouldSplit,
        yPercent: paragraphYPercentNoMask,
        y: paragraphY,
        position: ">-0.75",
        duration: 1
      });

      if (buttons.length > 0) {
        careersComponentTL.fromTo(buttons, {
          yPercent: buttonsYPercent,
          opacity: 0,
        },
          {
            yPercent: 0,
            opacity: 1,
            duration: 1,
            ease: defaultEasingOut,
            stagger: defaultStagger
          }, ">-0.6");
      }

      if (careersBoard) {
        careersComponentTL.fromTo(careersBoard, {
          yPercent: 15,
          opacity: 0
        },
          {
            yPercent: 0,
            opacity: 1,
            duration: 1,
            ease: defaultEasingOut,
            stagger: defaultStagger
          }, ">-1");
      }
    }

    createAnimation();
  });
}

// Career Post Component - GSAP Reveals
function careerPostComponent() {
  const components = document.querySelectorAll('.career-post_wrap');

  components.forEach(component => {
    const container = component.querySelector('.career-post_contain');
    const contentWrap = component.querySelector('.career-post_layout');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    let careerPostTL;

    function createAnimation() {
      if (careerPostTL) {
        careerPostTL.kill();
      }

      careerPostTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          scheduleScrollTriggerRefresh();
        }
      });

      if (contentWrap) {
        careerPostTL.fromTo(contentWrap, {
          opacity: 0,
        },
          {
            opacity: 1,
            duration: 1,
            ease: defaultEasingOut
          }, 1);
      }
    }

    createAnimation();
  });
}

// Contact Form Component - GSAP Reveals
function contactFormComponent() {
  const components = document.querySelectorAll('.contact-section_wrap');

  components.forEach(component => {
    const container = component.querySelector('.contact-section_contain');
    const headings = component.querySelectorAll('.contact-section_sidebar .c-heading');
    const paragraphs = component.querySelectorAll('.contact-section_sidebar .c-paragraph > *');
    const buttons = component.querySelectorAll('.button_main_wrap');
    const formWrap = component.querySelector('.contact-section_main');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const headingSplitData = createTextSplits(headings);
    // const paragraphSplitData = createTextSplits(paragraphs);
    const paragraphSplitData = createTextSplits(paragraphs, { mask: false });

    let contactFormTL;

    function createAnimation() {
      if (contactFormTL) {
        contactFormTL.kill();
      }

      contactFormTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (headingSplitData.shouldSplit) {
            headingSplitData.splits.forEach(s => s.revert());
          }
          if (paragraphSplitData.shouldSplit) {
            paragraphSplitData.splits.forEach(s => s.revert());
          }

          scheduleScrollTriggerRefresh(true);
        }
      });

      animateText(contactFormTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: 0,
        duration: 1.25
      });

      animateText(contactFormTL, {
        elements: paragraphs,
        lines: paragraphSplitData.lines,
        shouldSplit: paragraphSplitData.shouldSplit,
        yPercent: paragraphYPercentNoMask,
        y: paragraphY,
        position: ">-0.75",
        duration: 1
      });

      if (buttons.length > 0) {
        contactFormTL.fromTo(buttons, {
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

      if (formWrap) {
        contactFormTL.fromTo(formWrap, {
          opacity: 0,
        },
          {
            opacity: 1,
            duration: 1,
            ease: defaultEasingOut
          }, defaultPosition);
      }
    }

    createAnimation();
  });
}

// Basic Content Component - GSAP Reveals
function basicContentComponent() {
  const components = document.querySelectorAll('.basic-content_wrap');

  components.forEach(component => {
    const container = component.querySelector('.basic-content_contain');
    const splitLines = component.dataset.splitLines === 'true';
    const headings = component.querySelectorAll('.basic-content_layout .c-heading');
    const paragraphs = component.querySelectorAll('.basic-content_layout .c-paragraph > *');
    const content = component.querySelector('.basic-content_layout .c-paragraph');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const headingSplitData = createTextSplits(headings);
    // const paragraphSplitData = createTextSplits(paragraphs);
    const paragraphSplitData = splitLines ? createTextSplits(paragraphs, { mask: false }) : null;

    let basicContentTL;

    function createAnimation() {
      if (basicContentTL) {
        basicContentTL.kill();
      }

      basicContentTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (headingSplitData.shouldSplit) {
            headingSplitData.splits.forEach(s => s.revert());
          }
          if (splitLines && paragraphSplitData?.shouldSplit) {
            paragraphSplitData.splits.forEach(s => s.revert());
          }

          scheduleScrollTriggerRefresh();
        }
      });

      animateText(basicContentTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: 0,
        duration: 1.25
      });

      if (splitLines) {
        animateText(basicContentTL, {
          elements: paragraphs,
          lines: paragraphSplitData.lines,
          shouldSplit: paragraphSplitData.shouldSplit,
          yPercent: paragraphYPercentNoMask,
          y: paragraphY,
          position: ">-0.75",
          duration: 1
        });
      } else {
        if (content) {
          basicContentTL.fromTo(content, {
            opacity: 0
          },
            {
              opacity: 1,
              duration: 1.25,
              ease: defaultEasingOut
            }, 0);
        }
      }
    }

    createAnimation();
  });
}

// CMS Podcast Detail Page Body Component - GSAP Reveals
function cmsPodcastBodyComponent() {
  const components = document.querySelectorAll('.podcast-info_wrap');

  components.forEach(component => {
    const embedContainer = component.querySelector('.podcast-info_contain.is-embed');
    const embed = embedContainer.querySelector('iframe');

    const bodyContainer = component.querySelector('.podcast-info_contain.is-body');
    const bodyHeadings = bodyContainer.querySelectorAll('.podcast-info_content_heading, .podcast-info_content_subheading');
    const bodyParagraphs = bodyContainer.querySelectorAll('.c-paragraph > *');
    const bodyButtons = bodyContainer.querySelectorAll('.button_main_wrap');

    const navContainer = component.querySelector('.podcast-info_contain.is-nav');
    const bodyNavButtons = navContainer.querySelector('.podcast-info_cms-links_wrap');

    const hiddenItems = [...component.querySelectorAll('[data-gsap-hide]')];
    if (component.hasAttribute('data-gsap-hide')) {
      hiddenItems.push(component);
    }

    // Embed animation
    if (shouldSkipAnimation(embedContainer)) {
      embedContainer.querySelectorAll('[data-gsap-hide]').forEach(item => item.removeAttribute('data-gsap-hide'));
    } else {
      const embedTL = gsap.timeline({
        scrollTrigger: {
          trigger: embedContainer,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          embedContainer.querySelectorAll('[data-gsap-hide]').forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          scheduleScrollTriggerRefresh();
        }
      });

      if (embed) {
        embedTL.fromTo(embed, {
          yPercent: 25,
          opacity: 0
        },
          {
            yPercent: 0,
            opacity: 1,
            duration: 1,
            ease: defaultEasingOut
          }, 0);
      }
    }

    // Body animation
    if (shouldSkipAnimation(bodyContainer)) {
      bodyContainer.querySelectorAll('[data-gsap-hide]').forEach(item => item.removeAttribute('data-gsap-hide'));
      navContainer.querySelectorAll('[data-gsap-hide]').forEach(item => item.removeAttribute('data-gsap-hide'));
    } else {
      const bodyHeadingSplitData = createTextSplits(bodyHeadings);
      // const bodyParagraphSplitData = createTextSplits(bodyParagraphs);
      const bodyParagraphSplitData = createTextSplits(bodyParagraphs, { mask: false });

      const bodyTL = gsap.timeline({
        scrollTrigger: {
          trigger: bodyContainer,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          bodyContainer.querySelectorAll('[data-gsap-hide]').forEach(item => item.removeAttribute('data-gsap-hide'));
          navContainer.querySelectorAll('[data-gsap-hide]').forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (bodyHeadingSplitData.shouldSplit) {
            bodyHeadingSplitData.splits.forEach(split => split.revert());
            bodyParagraphSplitData.splits.forEach(split => split.revert());
          }
          scheduleScrollTriggerRefresh();
        }
      });

      animateText(bodyTL, {
        elements: bodyHeadings,
        lines: bodyHeadingSplitData.lines,
        shouldSplit: bodyHeadingSplitData.shouldSplit,
        position: 0,
        duration: 1.25
      });

      animateText(bodyTL, {
        elements: bodyParagraphs,
        lines: bodyParagraphSplitData.lines,
        shouldSplit: bodyParagraphSplitData.shouldSplit,
        yPercent: paragraphYPercentNoMask,
        y: paragraphY,
        position: ">-0.75",
        duration: 1
      });

      if (bodyButtons.length > 0) {
        bodyTL.fromTo(bodyButtons, {
          yPercent: buttonsYPercent,
          opacity: 0,
        },
          {
            yPercent: 0,
            opacity: 1,
            duration: 1,
            ease: defaultEasingOut,
            stagger: defaultStagger
          }, ">-0.75");
      }

      if (bodyNavButtons) {
        bodyTL.fromTo(bodyNavButtons, {
          yPercent: 100,
          opacity: 0
        },
          {
            yPercent: 0,
            opacity: 1,
            duration: 1,
            ease: defaultEasingOut
          }, defaultPosition);
      }
    }
  });
}

// CMS Work Detail Page Overview Component - GSAP Reveals
function cmsWorkOverviewComponent() {
  const components = document.querySelectorAll('.work-overview_wrap');

  components.forEach(component => {
    const container = component.querySelector('.work-overview_contain');
    const headings = component.querySelectorAll('.work-overview_heading_wrap *');
    const pieces = component.querySelectorAll('.work-overview_desc_pt-1_wrap, .work-overview_desc_pt-2_wrap, .work-overview_info_wrap, .work-overview_stats_wrap');
    const buttons = component.querySelectorAll('.button_main_wrap');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const headingSplitData = createTextSplits(headings);

    let cmsWorkOverviewTL;

    function createAnimation() {
      if (cmsWorkOverviewTL) {
        cmsWorkOverviewTL.kill();
      }

      cmsWorkOverviewTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (headingSplitData.shouldSplit) {
            headingSplitData.splits.forEach(split => split.revert());
          }

          scheduleScrollTriggerRefresh(true);
        }
      });

      animateText(cmsWorkOverviewTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: 0,
        duration: 1.25
      });

      if (pieces.length > 0) {
        pieces.forEach(piece => {
          const pieceBoxes = piece.querySelectorAll('.work-overview_info_item');
          const pieceHeadings = piece.querySelectorAll('.work-overview_desc_heading, .work-overview_stats_item_value');
          const pieceParagraphs = piece.querySelectorAll('.c-paragraph > *, .work-overview_info_item_label, .work-overview_info_item_value, .work-overview_info_item_tags_list, .work-overview_stats_item_label');

          const pieceHeadingSplitData = createTextSplits(pieceHeadings);
          // const pieceParagraphSplitData = createTextSplits(pieceParagraphs);
          const pieceParagraphSplitData = createTextSplits(pieceParagraphs, { mask: false });

          if (pieceBoxes.length > 0) {
            cmsWorkOverviewTL.fromTo(pieceBoxes, {
              yPercent: 50,
              opacity: 0
            },
              {
                yPercent: 0,
                opacity: 1,
                duration: 1.25,
                ease: defaultEasingOut,
                stagger: defaultStagger
              }, "<0.5");
          }

          animateText(cmsWorkOverviewTL, {
            elements: pieceHeadings,
            lines: pieceHeadingSplitData.lines,
            shouldSplit: pieceHeadingSplitData.shouldSplit,
            position: "<0.5",
            duration: 1.25,
            toVars: {
              onComplete: () => {
                if (pieceHeadingSplitData.shouldSplit) {
                  pieceHeadingSplitData.splits.forEach(split => split.revert());
                }
              }
            }
          });

          animateText(cmsWorkOverviewTL, {
            elements: pieceParagraphs,
            lines: pieceParagraphSplitData.lines,
            shouldSplit: pieceParagraphSplitData.shouldSplit,
            yPercent: paragraphYPercentNoMask,
            y: paragraphY,
            position: ">-1",
            duration: 1,
            toVars: {
              onComplete: () => {
                if (pieceParagraphSplitData.shouldSplit) {
                  pieceParagraphSplitData.splits.forEach(split => split.revert());
                }
              }
            }
          });
        });
      }

      if (buttons.length > 0) {
        cmsWorkOverviewTL.fromTo(buttons, {
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

    createAnimation();
  });
}

// CMS Work Detail Page Image Grid Component - GSAP Reveals
function cmsWorkImageGridComponent() {
  const components = document.querySelectorAll('.work-image-grid-1_wrap, .work-image-grid-2_wrap');

  components.forEach(component => {
    const containers = component.querySelectorAll('.work-image-grid-1_contain, .work-image-grid-2_contain');

    containers.forEach(container => {
      const pieces = container.querySelectorAll('.work-image-grid-1_layout > *, .work-image-grid-2_layout > *');

      pieces.forEach((piece, index) => {
        const pieceImages = [...piece.querySelectorAll('.work-image-grid_content-image_image_wrap, .work-image-grid_image_wrap')];
        if (piece.className.includes('work-image-grid_image_wrap')) {
          pieceImages.push(piece);
        }
        const pieceHeadings = piece.querySelectorAll('.work-image-grid_content-image_heading');
        const pieceParagraphs = piece.querySelectorAll('.work-image-grid_content-image_content_wrap .c-paragraph > *');
        const pieceButtons = piece.querySelectorAll('.button_main_wrap');
        const pieceHiddenItems = [...piece.querySelectorAll('[data-gsap-hide]')];
        if (piece.hasAttribute('data-gsap-hide')) {
          pieceHiddenItems.push(piece);
        }

        if (shouldSkipAnimation(piece)) {
          pieceHiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
          return;
        }

        const pieceHeadingSplitData = createTextSplits(pieceHeadings);
        // const pieceParagraphSplitData = createTextSplits(pieceParagraphs);
        const pieceParagraphSplitData = createTextSplits(pieceParagraphs, { mask: false });

        // Calculate delay based on grid position (2 columns on desktop only)
        const isTwoColumn = window.innerWidth > 868;
        const columnIndex = isTwoColumn ? index % 2 : 0;
        const staggerDelay = columnIndex * defaultStagger * 5;

        const cmsWorkImageGridPieceTL = gsap.timeline({
          scrollTrigger: {
            trigger: piece,
            start: getAnimationStart(),
            once: true
          },
          delay: staggerDelay,
          onStart: () => {
            pieceHiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
          },
          onComplete: () => {
            if (pieceHeadingSplitData.shouldSplit) {
              pieceHeadingSplitData.splits.forEach(split => split.revert());
              pieceParagraphSplitData.splits.forEach(split => split.revert());
            }

            scheduleScrollTriggerRefresh();
          }
        });

        animateText(cmsWorkImageGridPieceTL, {
          elements: pieceHeadings,
          lines: pieceHeadingSplitData.lines,
          shouldSplit: pieceHeadingSplitData.shouldSplit,
          duration: 1.25
        });

        animateText(cmsWorkImageGridPieceTL, {
          elements: pieceParagraphs,
          lines: pieceParagraphSplitData.lines,
          shouldSplit: pieceParagraphSplitData.shouldSplit,
          yPercent: paragraphYPercentNoMask,
          y: paragraphY,
          position: ">-0.75",
          duration: 1.25
        });

        if (pieceImages.length > 0) {
          cmsWorkImageGridPieceTL.fromTo(pieceImages, {
            opacity: 0
          },
            {
              opacity: 1,
              duration: 1.25,
              ease: defaultEasingOut,
              stagger: defaultStagger
            }, 0.5);
        }

        // if (pieceImages.length > 0) {
        //   cmsWorkImageGridPieceTL.fromTo(pieceImages, {
        //     clipPath: imageMaskedSwipeStart
        //   },
        //   {
        //     clipPath: imageMaskedSwipeEnd,
        //     duration: 2,
        //     ease: defaultEasingOut,
        //     stagger: (defaultStagger * 5)
        //   }, getPosition(cmsWorkImageGridPieceTL, "<0.5"));
        // }

        if (pieceButtons.length > 0) {
          cmsWorkImageGridPieceTL.fromTo(pieceButtons, {
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
      });
    });
  });
}

// CMS Work Detail Page Split Content Component - GSAP Reveals
function cmsWorkSplitContentComponent() {
  const components = document.querySelectorAll('.work-split-content_wrap');

  components.forEach(component => {
    const container = component.querySelector('.work-split-content_contain');
    const headings = component.querySelectorAll('.work-split-content_heading');
    const paragraphs = component.querySelectorAll('.work-split-content_text_wrap .c-paragraph > *');
    const buttons = component.querySelectorAll('.button_main_wrap');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const headingSplitData = createTextSplits(headings);

    let cmsWorkSplitContentTL;

    function createAnimation() {
      if (cmsWorkSplitContentTL) {
        cmsWorkSplitContentTL.kill();
      }

      cmsWorkSplitContentTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (headingSplitData.shouldSplit) {
            headingSplitData.splits.forEach(split => split.revert());
          }

          scheduleScrollTriggerRefresh();
        }
      });

      animateText(cmsWorkSplitContentTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: 0,
        duration: 1.25
      });

      // Paragraphs don't use SplitText here - animate as whole elements
      if (paragraphs.length > 0) {
        cmsWorkSplitContentTL.fromTo(paragraphs, {
          y: 40,
          opacity: 0
        },
          {
            y: 0,
            opacity: 1,
            duration: 1,
            ease: defaultEasingOut,
            stagger: defaultStagger
          }, ">-0.75");
      }

      if (buttons.length > 0) {
        cmsWorkSplitContentTL.fromTo(buttons, {
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

    createAnimation();
  });
}

// CMS Work Detail Page Full Image Component - GSAP Reveals
function cmsWorkFullImageComponent() {
  const components = document.querySelectorAll('.work-full-image_wrap');

  components.forEach(component => {
    const container = component.querySelector('.work-full-image_contain');
    const image = component.querySelector('.work-full-image_image_wrap');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    let cmsWorkFullImageTL;

    function createAnimation() {
      if (cmsWorkFullImageTL) {
        cmsWorkFullImageTL.kill();
      }

      cmsWorkFullImageTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          scheduleScrollTriggerRefresh();
        }
      });

      if (image) {
        cmsWorkFullImageTL.fromTo(image, {
          opacity: 0
        },
          {
            opacity: 1,
            duration: 1.25,
            ease: defaultEasingOut
          }, 0);
      }

      // if (image) {
      //   cmsWorkFullImageTL.fromTo(image, {
      //     clipPath: imageMaskedSwipeStart
      //   },
      //   {
      //     clipPath: imageMaskedSwipeEnd,
      //     duration: 2,
      //     ease: defaultEasingOut
      //   }, 0);
      // }
    }

    createAnimation();
  });
}

// CMS Work Detail Page Testimonial Component - GSAP Reveals
function cmsWorkTestimonialComponent() {
  const components = document.querySelectorAll('.work-testimonial_wrap');

  components.forEach(component => {
    const container = component.querySelector('.work-testimonial_contain');
    const paragraphs = component.querySelectorAll('.work-testimonial_content_name, .work-testimonial_content_title-company, .work-testimonial_content_quote');
    const image = component.querySelector('.work-testimonial_image_wrap > *');
    const buttons = component.querySelectorAll('.button_main_wrap');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    // const paragraphSplitData = createTextSplits(paragraphs);
    const paragraphSplitData = createTextSplits(paragraphs, { mask: false });

    let cmsWorkTestimonialTL;

    function createAnimation() {
      if (cmsWorkTestimonialTL) {
        cmsWorkTestimonialTL.kill();
      }

      cmsWorkTestimonialTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (paragraphSplitData.shouldSplit) {
            paragraphSplitData.splits.forEach(split => split.revert());
          }

          scheduleScrollTriggerRefresh();
        }
      });

      animateText(cmsWorkTestimonialTL, {
        elements: paragraphs,
        lines: paragraphSplitData.lines,
        shouldSplit: paragraphSplitData.shouldSplit,
        yPercent: paragraphYPercentNoMask,
        y: paragraphY,
        position: 0,
        duration: 1
      });

      // if (image) {
      //   cmsWorkTestimonialTL.fromTo(image, {
      //     opacity: 0
      //   },
      //   {
      //     opacity: 1,
      //     duration: 1.25,
      //     ease: defaultEasingOut
      //   }, 0.5);
      // }

      if (image) {
        cmsWorkTestimonialTL.fromTo(image, {
          clipPath: imageMaskedSwipeStart
        },
          {
            clipPath: imageMaskedSwipeEnd,
            duration: 1.75,
            ease: defaultEasingOut
          }, 0.5);
      }

      if (buttons.length > 0) {
        cmsWorkTestimonialTL.fromTo(buttons, {
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

    createAnimation();
  });
}

// CMS Work Detail Page Credits Component - GSAP Reveals
function cmsWorkCreditsComponent() {
  const components = document.querySelectorAll('.work-credits_wrap');

  components.forEach(component => {
    const container = component.querySelector('.work-credits_contain');
    const headings = component.querySelectorAll('.work-credits_heading');
    const paragraphs = component.querySelectorAll('.work-credits_content > p');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const headingSplitData = createTextSplits(headings);

    let cmsWorkCreditsComponentTL;

    function createAnimation() {
      if (cmsWorkCreditsComponentTL) {
        cmsWorkCreditsComponentTL.kill();
      }

      cmsWorkCreditsComponentTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (headingSplitData.shouldSplit) {
            headingSplitData.splits.forEach(split => split.revert());
          }

          scheduleScrollTriggerRefresh();
        }
      });

      animateText(cmsWorkCreditsComponentTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: 0,
        duration: 1.25
      });

      // Paragraphs animate as whole elements (not split)
      if (paragraphs.length > 0) {
        cmsWorkCreditsComponentTL.fromTo(paragraphs, {
          yPercent: paragraphYPercent,
          opacity: 0
        },
          {
            yPercent: 0,
            opacity: 1,
            duration: 1,
            ease: defaultEasingOut,
            stagger: defaultStagger
          }, ">-0.75");
      }
    }

    createAnimation();
  });
}

// Expertise Stack Component - GSAP Reveals
function expertiseStackComponent() {
  const components = document.querySelectorAll('.expertise-stack_wrap');

  components.forEach(component => {
    const container = component.querySelector('.expertise-stack_contain.is-header');
    const headings = container.querySelectorAll('.c-heading');
    const paragraphs = container.querySelectorAll('.c-paragraph > *');
    const itemsContainer = component.querySelector('.expertise-stack_contain.is-stack');
    const items = component.querySelectorAll('.expertise-stack_item');

    // Container animation
    if (shouldSkipAnimation(container)) {
      container.querySelectorAll('[data-gsap-hide]').forEach(item => item.removeAttribute('data-gsap-hide'));
      itemsContainer.removeAttribute('data-gsap-hide');
    } else {
      const headingSplitData = createTextSplits(headings);
      // const paragraphSplitData = createTextSplits(paragraphs);
      const paragraphSplitData = createTextSplits(paragraphs, { mask: false });

      const containerTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          container.querySelectorAll('[data-gsap-hide]').forEach(item => item.removeAttribute('data-gsap-hide'));
          itemsContainer.removeAttribute('data-gsap-hide');
        },
        onComplete: () => {
          if (headingSplitData.shouldSplit) {
            headingSplitData.splits.forEach(s => s.revert());
          }
          if (paragraphSplitData.shouldSplit) {
            paragraphSplitData.splits.forEach(s => s.revert());
          }

          scheduleScrollTriggerRefresh();
        }
      });

      animateText(containerTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: 0,
        duration: 1.25
      });

      animateText(containerTL, {
        elements: paragraphs,
        lines: paragraphSplitData.lines,
        shouldSplit: paragraphSplitData.shouldSplit,
        yPercent: paragraphYPercentNoMask,
        y: paragraphY,
        position: ">-0.75",
        duration: 1
      });

      if (itemsContainer) {
        containerTL.fromTo(itemsContainer, {
          opacity: 0
        },
          {
            opacity: 1,
            duration: 1.25,
            ease: defaultEasingOut
          }, ">-0.75");
      }
    }

    // Individual item animations
    if (items.length > 0) {
      items.forEach(item => {
        if (shouldSkipAnimation(item)) {
          item.querySelectorAll('[data-gsap-hide]').forEach(el => el.removeAttribute('data-gsap-hide'));
          return;
        }

        const itemImage = item.querySelector('.expertise-stack_item_image_wrap');
        const itemHeadings = item.querySelectorAll('.expertise-stack_item_heading .c-heading');
        const itemParagraphs = item.querySelectorAll('.expertise-stack_item_text .c-paragraph > *');
        const itemButtons = item.querySelectorAll('.button_main_wrap');

        const itemHeadingSplitData = createTextSplits(itemHeadings);
        // const itemParagraphSplitData = createTextSplits(itemParagraphs);
        const itemParagraphSplitData = createTextSplits(itemParagraphs, { mask: false });

        const itemTL = gsap.timeline({
          scrollTrigger: {
            trigger: item,
            start: getAnimationStart(30, 50),
            once: true
          },
          onStart: () => {
            item.querySelectorAll('[data-gsap-hide]').forEach(el => el.removeAttribute('data-gsap-hide'));
          },
          onComplete: () => {
            if (itemHeadingSplitData.shouldSplit) {
              itemHeadingSplitData.splits.forEach(split => split.revert());
            }
            if (itemParagraphSplitData.shouldSplit) {
              itemParagraphSplitData.splits.forEach(split => split.revert());
            }

            scheduleScrollTriggerRefresh();
          }
        });

        if (itemImage) {
          itemTL.fromTo(itemImage, {
            webkitMaskImage: 'linear-gradient(to right, black 0%, black 0%, transparent 0%, transparent 100%)',
            maskImage: 'linear-gradient(to right, black 0%, black 0%, transparent 0%, transparent 100%)'
          },
            {
              webkitMaskImage: 'linear-gradient(to right, black 0%, black 100%, transparent 100%, transparent 100%)',
              maskImage: 'linear-gradient(to right, black 0%, black 100%, transparent 100%, transparent 100%)',
              duration: 1.5,
              ease: defaultEasingOut
            }, 0);
        }

        // if (itemImage) {
        //   itemTL.fromTo(itemImage, {
        //     opacity: 0
        //   },
        //   {
        //     opacity: 1,
        //     duration: 1.25,
        //     ease: defaultEasingOut
        //   }, 0);
        // }

        animateText(itemTL, {
          elements: itemHeadings,
          lines: itemHeadingSplitData.lines,
          shouldSplit: itemHeadingSplitData.shouldSplit,
          position: 0.25,
          duration: 1.25
        });

        animateText(itemTL, {
          elements: itemParagraphs,
          lines: itemParagraphSplitData.lines,
          shouldSplit: itemParagraphSplitData.shouldSplit,
          yPercent: paragraphYPercentNoMask,
          y: paragraphY,
          position: ">-0.75",
          duration: 1
        });

        if (itemButtons.length > 0) {
          itemTL.fromTo(itemButtons, {
            yPercent: buttonsYPercent,
            opacity: 0,
          },
            {
              yPercent: 0,
              opacity: 1,
              duration: 1,
              ease: defaultEasingOut,
              stagger: defaultStagger
            }, ">-0.75");
        }
      });
    }
  });
}

// Icon Cards Component - GSAP Reveals
function iconCardsComponent() {
  const components = document.querySelectorAll('.icon-cards_wrap');

  components.forEach(component => {
    const container = component.querySelector('.icon-cards_contain');
    const headings = component.querySelectorAll('.icon-cards_heading_wrap .c-heading');
    const paragraphs = component.querySelectorAll('.icon-cards_content_wrap .c-paragraph > *');
    const items = component.querySelectorAll('.icon-cards_card_wrap');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const headingSplitData = createTextSplits(headings);
    // const paragraphSplitData = createTextSplits(paragraphs);
    const paragraphSplitData = createTextSplits(paragraphs, { mask: false });

    let iconCardsComponentTL;

    function createAnimation() {
      if (iconCardsComponentTL) {
        iconCardsComponentTL.kill();
      }

      iconCardsComponentTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (headingSplitData.shouldSplit) {
            headingSplitData.splits.forEach(s => s.revert());
          }
          if (paragraphSplitData.shouldSplit) {
            paragraphSplitData.splits.forEach(s => s.revert());
          }

          scheduleScrollTriggerRefresh();
        }
      });

      animateText(iconCardsComponentTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: 0,
        duration: 1.25
      });

      animateText(iconCardsComponentTL, {
        elements: paragraphs,
        lines: paragraphSplitData.lines,
        shouldSplit: paragraphSplitData.shouldSplit,
        yPercent: paragraphYPercentNoMask,
        y: paragraphY,
        position: ">-0.75",
        duration: 1
      });

      if (items.length > 0) {
        iconCardsComponentTL.fromTo(items, {
          opacity: 0
        },
          {
            opacity: 1,
            duration: 1,
            ease: defaultEasingOut,
            stagger: defaultStagger * 2
          }, defaultPosition);
      }

    }

    createAnimation();
  });
}

// Attributes Grid Component - GSAP Reveals
function attributesGridComponent() {
  const components = document.querySelectorAll('.attributes_wrap');

  components.forEach(component => {
    const container = component.querySelector('.attributes_contain');
    const headings = component.querySelectorAll('.attributes_heading_wrap .c-heading');
    // const paragraphs = component.querySelectorAll('.attributes_heading_wrap .c-paragraph > *');
    const items = component.querySelectorAll('.attributes_grid_item_wrap');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const headingSplitData = createTextSplits(headings);
    // const paragraphSplitData = createTextSplits(paragraphs);
    // const paragraphSplitData = createTextSplits(paragraphs, { mask: false });

    let attributesGridComponentTL;

    function createAnimation() {
      if (attributesGridComponentTL) {
        attributesGridComponentTL.kill();
      }

      attributesGridComponentTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (headingSplitData.shouldSplit) {
            headingSplitData.splits.forEach(split => split.revert());
            // paragraphSplitData.splits.forEach(split => split.revert());
          }

          scheduleScrollTriggerRefresh();
        }
      });

      animateText(attributesGridComponentTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: 0,
        duration: 1.25
      });

      // animateText(attributesGridComponentTL, {
      //   elements: paragraphs,
      //   lines: paragraphSplitData.lines,
      //   shouldSplit: paragraphSplitData.shouldSplit,
      //   yPercent: paragraphYPercentNoMask,
      //   y: paragraphY,
      //   position: ">-0.75",
      //   duration: 1
      // });

      items.forEach(item => {
        const itemIcon = item.querySelectorAll('.attributes_grid_item_icon_wrap');
        const itemEyebrow = item.querySelectorAll('.eyebrow_text *');
        const itemHeading = item.querySelectorAll('.c-heading');
        const itemParagraphs = item.querySelectorAll('.c-paragraph > *');

        const itemEyebrowSplitData = createTextSplits(itemEyebrow);
        const itemHeadingSplitData = createTextSplits(itemHeading);
        // const itemParagraphSplitData = createTextSplits(itemParagraphs);
        const itemParagraphSplitData = createTextSplits(itemParagraphs, { mask: false });

        if (itemIcon.length > 0) {
          attributesGridComponentTL.fromTo(itemIcon, {
            opacity: 0
          },
            {
              opacity: 1,
              duration: 1,
              ease: defaultEasingOut,
              stagger: defaultStagger
            }, ">-1");
        }

        animateText(attributesGridComponentTL, {
          elements: itemEyebrow,
          lines: itemEyebrowSplitData.lines,
          shouldSplit: itemEyebrowSplitData.shouldSplit,
          position: ">-1",
          duration: 1,
          toVars: {
            onComplete: () => {
              if (itemEyebrowSplitData.shouldSplit) {
                itemEyebrowSplitData.splits.forEach(split => split.revert());
              }
            }
          }
        });

        animateText(attributesGridComponentTL, {
          elements: itemHeading,
          lines: itemHeadingSplitData.lines,
          shouldSplit: itemHeadingSplitData.shouldSplit,
          position: ">-1",
          duration: 1,
          toVars: {
            onComplete: () => {
              if (itemHeadingSplitData.shouldSplit) {
                itemHeadingSplitData.splits.forEach(split => split.revert());
              }
            }
          }
        });

        animateText(attributesGridComponentTL, {
          elements: itemParagraphs,
          lines: itemParagraphSplitData.lines,
          shouldSplit: itemParagraphSplitData.shouldSplit,
          yPercent: paragraphYPercentNoMask,
          y: paragraphY,
          position: ">-0.75",
          duration: 1,
          toVars: {
            onComplete: () => {
              if (itemParagraphSplitData.shouldSplit) {
                itemParagraphSplitData.splits.forEach(split => split.revert());
              }
            }
          }
        });
      })
    }

    createAnimation();
  });
}

// Attribute Callout Component - GSAP Reveals
function attributeCalloutComponent() {
  const components = document.querySelectorAll('.attribute-callout_wrap');

  components.forEach(component => {
    const container = component.querySelector('.attribute-callout_contain');
    const bgImage = component.querySelector('.attribute-callout_bg-image');
    const innerImage = component.querySelector('.attribute-callout_inner-image');
    const eyebrows = component.querySelectorAll('.eyebrow_text *');
    const headings = component.querySelectorAll('.c-heading');
    const paragraphs = component.querySelectorAll('.c-paragraph > *');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const eyebrowSplitData = createTextSplits(eyebrows);
    const headingSplitData = createTextSplits(headings);
    // const paragraphSplitData = createTextSplits(paragraphs);
    const paragraphSplitData = createTextSplits(paragraphs, { mask: false });

    let attributeCalloutTL;

    function createAnimation() {
      if (attributeCalloutTL) {
        attributeCalloutTL.kill();
      }

      attributeCalloutTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (eyebrowSplitData.shouldSplit) {
            eyebrowSplitData.splits.forEach(split => split.revert());
          }
          if (headingSplitData.shouldSplit) {
            headingSplitData.splits.forEach(split => split.revert());
          }
          if (paragraphSplitData.shouldSplit) {
            paragraphSplitData.splits.forEach(split => split.revert());
          }

          scheduleScrollTriggerRefresh(true);
        }
      });

      if (bgImage) {
        attributeCalloutTL.fromTo(bgImage, {
          opacity: 0
        },
          {
            opacity: 1,
            duration: 1.25,
            ease: defaultEasingOut
          }, getPosition(attributeCalloutTL));
      }

      if (innerImage) {
        attributeCalloutTL.fromTo(innerImage, {
          clipPath: imageMaskedSwipeStart
        },
          {
            clipPath: imageMaskedSwipeEnd,
            duration: 1.5,
            ease: defaultEasingOut
          }, defaultPosition);
      }

      animateText(attributeCalloutTL, {
        elements: eyebrows,
        lines: eyebrowSplitData.lines,
        shouldSplit: eyebrowSplitData.shouldSplit,
        yPercent: paragraphYPercent,
        y: paragraphY,
        position: ">-0.75",
        duration: 0.8
      });

      animateText(attributeCalloutTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: defaultPosition,
        duration: 1.25
      });

      animateText(attributeCalloutTL, {
        elements: paragraphs,
        lines: paragraphSplitData.lines,
        shouldSplit: paragraphSplitData.shouldSplit,
        yPercent: paragraphYPercentNoMask,
        y: paragraphY,
        position: ">-1",
        duration: 1
      });
    }

    createAnimation();
  });
}

// Team Grid Component - GSAP Reveals
function teamGridComponent() {
  const components = document.querySelectorAll('.team-grid_wrap');

  components.forEach((component, index) => {
    const container = component.querySelector('.team-grid_contain');
    const headings = component.querySelectorAll('.c-heading');
    const items = component.querySelectorAll('.team-grid_collection_item');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const headingSplitData = createTextSplits(headings);

    let teamGridComponentTL;

    function createAnimation() {
      if (teamGridComponentTL) {
        teamGridComponentTL.kill();
      }

      teamGridComponentTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (headingSplitData.shouldSplit) {
            headingSplitData.splits.forEach(s => s.revert());
          }

          scheduleScrollTriggerRefresh(true);
        }
      });

      animateText(teamGridComponentTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: 0,
        duration: 1.25
      });

      items.forEach((item, index) => {
        const itemImage = item.querySelector('.team-grid_collection_item_image');
        const itemHeadings = item.querySelectorAll('.team-grid_collection_item_name');
        const itemParagraphs = item.querySelectorAll('.team-grid_collection_item_title');

        const itemHeadingSplitData = createTextSplits(itemHeadings);
        // const itemParagraphSplitData = createTextSplits(itemParagraphs);
        const itemParagraphSplitData = createTextSplits(itemParagraphs, { mask: false });

        if (itemImage) {
          teamGridComponentTL.fromTo(itemImage, {
            clipPath: imageMaskedSwipeStart
          },
            {
              clipPath: imageMaskedSwipeEnd,
              duration: 1.25,
              ease: defaultEasingOut
            }, ((index + 1) * 0.5));
        }

        animateText(teamGridComponentTL, {
          elements: itemHeadings,
          lines: itemHeadingSplitData.lines,
          shouldSplit: itemHeadingSplitData.shouldSplit,
          position: "<0.25",
          duration: 1,
          toVars: {
            onComplete: () => {
              if (itemHeadingSplitData.shouldSplit) {
                itemHeadingSplitData.splits.forEach(split => split.revert());
              }
            }
          }
        });

        animateText(teamGridComponentTL, {
          elements: itemParagraphs,
          lines: itemParagraphSplitData.lines,
          shouldSplit: itemParagraphSplitData.shouldSplit,
          yPercent: paragraphYPercentNoMask,
          y: paragraphY,
          position: ">-0.75",
          duration: 1,
          toVars: {
            onComplete: () => {
              if (itemParagraphSplitData.shouldSplit) {
                itemParagraphSplitData.splits.forEach(split => split.revert());
              }
            }
          }
        });
      })
    }

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
    const paragraphs = component.querySelectorAll('.ct_sub-heading, .ct_intro-text, .ct_intro-text_attr, .ct_intro-text_attr_text');
    const questionGroups = component.querySelectorAll('.ct_question-group');
    const buttons = component.querySelectorAll('button.ct_btn-submit');
    const hiddenItems = component.querySelectorAll('[data-gsap-hide]');

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const eyebrowSplitData = createTextSplits(eyebrows);
    const headingSplitData = createTextSplits(headings);
    // const paragraphSplitData = createTextSplits(paragraphs);
    const paragraphSplitData = createTextSplits(paragraphs, { mask: false });

    let compassTeaserComponentTL;

    function createAnimation() {
      if (compassTeaserComponentTL) {
        compassTeaserComponentTL.kill();
      }

      compassTeaserComponentTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (eyebrowSplitData.shouldSplit) {
            eyebrowSplitData.splits.forEach(split => split.revert());
            headingSplitData.splits.forEach(split => split.revert());
            paragraphSplitData.splits.forEach(split => split.revert());
          }

          scheduleScrollTriggerRefresh(true);
        }
      });

      animateText(compassTeaserComponentTL, {
        elements: eyebrows,
        lines: eyebrowSplitData.lines,
        shouldSplit: eyebrowSplitData.shouldSplit,
        yPercent: paragraphYPercent,
        y: paragraphY,
        position: 0,
        duration: 0.8
      });

      animateText(compassTeaserComponentTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: defaultPosition,
        duration: 1.25
      });

      animateText(compassTeaserComponentTL, {
        elements: paragraphs,
        lines: paragraphSplitData.lines,
        shouldSplit: paragraphSplitData.shouldSplit,
        yPercent: paragraphYPercentNoMask,
        y: paragraphY,
        position: defaultPosition,
        duration: 1
      });

      if (questionGroups.length > 0) {
        compassTeaserComponentTL.fromTo(questionGroups, {
          opacity: 0
        },
          {
            opacity: 1,
            duration: 1,
            ease: defaultEasingOut,
            stagger: (defaultStagger * 1.5)
          }, ">-1");
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

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const eyebrowSplitData = createTextSplits(eyebrows);
    const headingSplitData = createTextSplits(headings);
    // const paragraphSplitData = createTextSplits(paragraphs);
    const paragraphSplitData = createTextSplits(paragraphs, { mask: false });

    let fitAssessmentComponentTL;

    function createAnimation() {
      if (fitAssessmentComponentTL) {
        fitAssessmentComponentTL.kill();
      }

      fitAssessmentComponentTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (eyebrowSplitData.shouldSplit) {
            eyebrowSplitData.splits.forEach(split => split.revert());
            headingSplitData.splits.forEach(split => split.revert());
            paragraphSplitData.splits.forEach(split => split.revert());
          }

          scheduleScrollTriggerRefresh(true);
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

      animateText(fitAssessmentComponentTL, {
        elements: eyebrows,
        lines: eyebrowSplitData.lines,
        shouldSplit: eyebrowSplitData.shouldSplit,
        yPercent: paragraphYPercent,
        y: paragraphY,
        position: defaultPosition,
        duration: 0.8
      });

      animateText(fitAssessmentComponentTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: defaultPosition,
        duration: 1.25
      });

      animateText(fitAssessmentComponentTL, {
        elements: paragraphs,
        lines: paragraphSplitData.lines,
        shouldSplit: paragraphSplitData.shouldSplit,
        yPercent: paragraphYPercentNoMask,
        y: paragraphY,
        position: defaultPosition,
        duration: 1
      });

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

    if (shouldSkipAnimation(container)) {
      hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
      return;
    }

    const headingSplitData = createTextSplits(headings);

    let footerComponentTL;

    function createAnimation() {
      if (footerComponentTL) {
        footerComponentTL.kill();
      }

      footerComponentTL = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: getAnimationStart(),
          once: true
        },
        onStart: () => {
          hiddenItems.forEach(item => item.removeAttribute('data-gsap-hide'));
        },
        onComplete: () => {
          if (headingSplitData.shouldSplit) {
            headingSplitData.splits.forEach(split => split.revert());
          }

          scheduleScrollTriggerRefresh();
        }
      });

      animateText(footerComponentTL, {
        elements: headings,
        lines: headingSplitData.lines,
        shouldSplit: headingSplitData.shouldSplit,
        position: ">",
        duration: 1.25
      });

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
          }, 1);
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

    createAnimation();
  });
}

// Data-Driven Animation Component
// Reusable animation system using data-attributes for any Webflow component
// Usage: Add data-animate-container to wrapper, and data-animate="type-direction" to child elements
// Examples: data-animate="fade-up", data-animate="swipe-left", data-animate="slide-right"
// Container-level: data-animate-container="swipe-left" will animate all children as a group
function dataAnimationComponent() {
  const containers = document.querySelectorAll('[data-animate-container]');
  console.log('[dataAnimation] Found', containers.length, 'containers');
  
  containers.forEach((container, index) => {
    console.log('[dataAnimation] Processing container', index, '- initialized:', container.hasAttribute('data-gsap-initialized'));
    
    // Prevent duplicate animations
    if (container.hasAttribute('data-gsap-initialized')) {
      console.log('[dataAnimation] Container already initialized, skipping');
      return;
    }
    container.setAttribute('data-gsap-initialized', 'true');
    console.log('[dataAnimation] Marked container as initialized');
    
    // Check if this is a container-level animation
    const containerAnimation = container.dataset.animateContainer;
    
    if (containerAnimation) {
      console.log('[dataAnimation] Container-level animation:', containerAnimation);
      animateContainerChildren(container, containerAnimation);
    } else {
      console.log('[dataAnimation] Element-level animation');
      animateElementsInOrder(container);
    }
  });
}

function animateContainerChildren(container, animationType) {
  const [type, direction] = animationType.split('-');
  const start = container.dataset.animateStart || getAnimationStart();
  const duration = parseFloat(container.dataset.animateDuration) || 1;
  const stagger = parseFloat(container.dataset.animateStagger) || 0.1;
  const children = container.querySelectorAll(container.dataset.animateChildren || '> *');
  
  if (children.length === 0 || shouldSkipAnimation(container)) {
    children.forEach(child => child.removeAttribute('data-gsap-hide'));
    return;
  }
  
  const { fromVars, toVars } = getDirectionalAnimationVars(type, direction);
  
  gsap.timeline({
    scrollTrigger: { trigger: container, start: start, once: true },
    onStart: () => children.forEach(child => child.removeAttribute('data-gsap-hide'))
  }).fromTo(children, fromVars, { ...toVars, duration, ease: defaultEasingOut, stagger });
}

function animateElementsInOrder(container) {
  const allElements = Array.from(container.querySelectorAll('[data-animate]'));
  console.log('[animateElementsInOrder] Found', allElements.length, 'elements');
  console.log('[animateElementsInOrder] Elements:', allElements.map(el => el.dataset.animate));
  
  if (allElements.length === 0) {
    console.log('[animateElementsInOrder] No elements found, returning');
    return;
  }
  
  // Prevent duplicate timeline creation
  if (container.dataset.animateTimelineCreated === 'true') {
    console.log('[animateElementsInOrder] Timeline already created, returning early');
    return;
  }
  
  const start = container.dataset.animateStart || getAnimationStart();
  const once = container.dataset.animateOnce !== 'false';
  
  console.log('[animateElementsInOrder] Start:', start, '| Once:', once);
  
  if (shouldSkipAnimation(container)) {
    console.log('[animateElementsInOrder] Should skip animation');
    allElements.forEach(el => el.removeAttribute('data-gsap-hide'));
    return;
  }
  
  // Mark timeline as created to prevent duplicates
  container.dataset.animateTimelineCreated = 'true';
  console.log('[animateElementsInOrder] Marked timeline as created');
  
  // Group elements by type for text splitting
  const textSplitElements = allElements.filter(el => el.dataset.animate === 'text-split');
  
  // Create splits individually for each element to track which lines belong to which element
  const elementSplitData = new Map();
  
  textSplitElements.forEach(el => {
    const splitType = el.dataset.animateType || 'headings';
    const useMask = splitType === 'headings';
    console.log('[SplitText] Creating split for element:', el.tagName, 'type:', splitType, 'mask:', useMask, 'shouldSplit:', !isPortrait);
    const splitData = createTextSplits([el], { mask: useMask });
    console.log('[SplitText] Result - splits:', splitData.splits.length, 'lines:', splitData.lines.length, 'shouldSplit:', splitData.shouldSplit);
    
    // Set initial state for animation
    if (splitData.shouldSplit && splitData.lines.length > 0) {
      // Keep parent visible, hide only the split lines
      gsap.set(el, { opacity: 1 });
      gsap.set(splitData.lines, { opacity: 0, yPercent: splitType === 'headings' ? headingYPercent : paragraphYPercentNoMask });
    } else {
      // If not splitting, hide the element itself
      gsap.set(el, { opacity: 0, y: splitType === 'headings' ? headingY : paragraphY });
    }
    
    elementSplitData.set(el, {
      ...splitData,
      splitType
    });
  });
  
  console.log('[animateElementsInOrder] Creating GSAP timeline');
  
  // Track animation state to prevent restart on refresh
  let hasAnimationStarted = false;
  let animationProgress = 0;
  
  const animationTL = gsap.timeline({
    scrollTrigger: { 
      trigger: container, 
      start: start, 
      once: once,
      onRefresh: (self) => {
        console.log('[ScrollTrigger] Refreshed - hasAnimationStarted:', hasAnimationStarted, 'progress:', animationProgress);
        // If animation already started, don't let refresh reset it
        if (hasAnimationStarted && animationTL) {
          animationTL.progress(animationProgress);
        }
      }
    },
    onStart: () => {
      console.log('[Timeline] Animation STARTED');
      hasAnimationStarted = true;
    },
    onComplete: () => {
      console.log('[Timeline] Animation COMPLETED');
      animationProgress = 1;
      // Revert all splits
      elementSplitData.forEach(data => {
        data.splits?.forEach(s => s.revert());
      });
      // Removed scheduleScrollTriggerRefresh to prevent re-triggering
    },
    onRepeat: () => {
      console.log('[Timeline] Animation REPEATED');
    },
    onUpdate: () => {
      if (animationTL) {
        animationProgress = animationTL.progress();
      }
    }
  });
  
  console.log('[animateElementsInOrder] Timeline created with ScrollTrigger:', animationTL.scrollTrigger ? 'YES' : 'NO');
  
  // Process in DOM order
  allElements.forEach((el, index) => {
      const animateType = el.dataset.animate;
      const duration = parseFloat(el.dataset.animateDuration) || 1;
      const delay = parseFloat(el.dataset.animateDelay) || 0;
      const position = index === 0 ? 0 : ">-0.5";
      
      console.log('[Timeline] Adding animation for element', index, '- type:', animateType, '- position:', position);
      
      // Check for text-split first (before directional check since it contains a hyphen)
      if (animateType === 'text-split') {
        const elementData = elementSplitData.get(el);
        if (elementData) {
          console.log('[Timeline] Adding text-split animation - type:', elementData.splitType, 'lines:', elementData.lines.length, 'shouldSplit:', elementData.shouldSplit);
          console.log('[Timeline] First line element:', elementData.lines[0]);
          const useMask = elementData.splitType === 'headings';
          if (elementData.shouldSplit && elementData.lines.length > 0) {
            // Animate split lines
            animationTL.fromTo(elementData.lines, {
              yPercent: useMask ? headingYPercent : paragraphYPercentNoMask,
              opacity: 0
            }, {
              yPercent: 0,
              opacity: 1,
              duration: duration,
              ease: defaultEasingOut,
              stagger: defaultStagger
            }, position);
          } else {
            // Animate whole element
            animationTL.fromTo(el, {
              y: useMask ? headingY : paragraphY,
              opacity: 0
            }, {
              y: 0,
              opacity: 1,
              duration: duration,
              ease: defaultEasingOut
            }, position);
          }
        }
      }
      // Directional animations: fade-up, slide-left, etc.
      else if (animateType.includes('-')) {
        const [type, direction] = animateType.split('-');
        console.log('[Timeline] Directional animation:', type, direction);
        const { fromVars, toVars } = getDirectionalAnimationVars(type, direction);
        animationTL.fromTo(el, fromVars, { ...toVars, duration, ease: defaultEasingOut, delay }, position);
      }
      // Standard animations
      else switch (animateType) {
        case 'button':
          console.log('[Timeline] Adding button animation');
          animationTL.fromTo(el, { yPercent: buttonsYPercent, opacity: 0 }, { yPercent: 0, opacity: 1, duration, ease: defaultEasingOut, delay }, position);
          break;
        case 'image':
          const imgType = el.dataset.animateType || 'swipe';
          console.log('[Timeline] Adding image animation - type:', imgType);
          if (imgType === 'swipe') {
            animationTL.fromTo(el, { clipPath: imageMaskedSwipeStart }, { clipPath: imageMaskedSwipeEnd, duration, ease: defaultEasingOut, delay }, position);
          } else if (imgType === 'fade') {
            animationTL.fromTo(el, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration, ease: defaultEasingOut, delay }, position);
          } else if (imgType === 'scale') {
            animationTL.fromTo(el, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration, ease: defaultEasingOut, delay }, position);
          }
          break;
        default:
          console.log('[Timeline] Adding default fade animation');
          animationTL.fromTo(el, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration, ease: defaultEasingOut, delay }, position);
      }
    });
  
  console.log('[animateElementsInOrder] Timeline built with', animationTL.getChildren().length, 'tweens');
}

function getDirectionalAnimationVars(type, direction) {
  const fromVars = { opacity: 0 };
  const toVars = { opacity: 1 };
  
  switch (type) {
    case 'swipe':
      switch (direction) {
        case 'left': fromVars.clipPath = 'inset(0 100% 0 0)'; toVars.clipPath = 'inset(0 0% 0 0)'; break;
        case 'right': fromVars.clipPath = 'inset(0 0 0 100%)'; toVars.clipPath = 'inset(0 0 0 0%)'; break;
        case 'up': fromVars.clipPath = 'inset(100% 0 0 0)'; toVars.clipPath = 'inset(0% 0 0 0)'; break;
        case 'down': fromVars.clipPath = 'inset(0 0 100% 0)'; toVars.clipPath = 'inset(0 0 0% 0)'; break;
        default: fromVars.clipPath = 'inset(0 100% 0 0)'; toVars.clipPath = 'inset(0 0% 0 0)';
      }
      break;
    case 'fade':
      switch (direction) {
        case 'up': fromVars.y = 30; toVars.y = 0; break;
        case 'down': fromVars.y = -30; toVars.y = 0; break;
        case 'left': fromVars.x = 30; toVars.x = 0; break;
        case 'right': fromVars.x = -30; toVars.x = 0; break;
        default: fromVars.y = 20; toVars.y = 0;
      }
      break;
    case 'slide':
      fromVars.opacity = 1;
      toVars.opacity = 1;
      switch (direction) {
        case 'up': fromVars.y = 50; toVars.y = 0; break;
        case 'down': fromVars.y = -50; toVars.y = 0; break;
        case 'left': fromVars.x = 50; toVars.x = 0; break;
        case 'right': fromVars.x = -50; toVars.x = 0; break;
        default: fromVars.y = 50; toVars.y = 0;
      }
      break;
  }
  
  return { fromVars, toVars };
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
  if (!isIOS) {
    odometers();
  }
  marquees();
  formStuff();
  expertiseStackNav();
  heroVantaBG();
  finsweetStuff();

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
  document.querySelectorAll('.accordion-section_wrap, .load-more, .about_wrap, .stat-grid_wrap').forEach(el => {
    resizeObserver.observe(el);
  });

}; // end init

$(window).on("load", init);
