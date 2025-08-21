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
        scrub: true,
        pin: true,
        invalidateOnRefresh: true,
        pinSpacing: true,  // Explicitly set pin spacing
        // anticipatePin: 1,
        scroller: document.body,
        // pinType: "transform",
        pinType: "fixed",
        // immediatePin: true,
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

// Compass Scroll Lock Section with SVG Chart
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
