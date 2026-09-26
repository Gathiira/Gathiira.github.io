(function () {
  'use strict';

  // Footer year
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile nav toggle
  var navToggle = document.querySelector('.nav-toggle');
  var body = document.body;
  if (navToggle) {
    navToggle.addEventListener('click', function () {
      var isOpen = body.classList.toggle('nav-open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    document.querySelectorAll('.nav-links a').forEach(function (link) {
      link.addEventListener('click', function () {
        body.classList.remove('nav-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Scrollspy: highlight active nav link
  var sections = Array.prototype.slice.call(document.querySelectorAll('main section[id]'));
  var navLinks = document.querySelectorAll('.nav-links a');
  if (sections.length && navLinks.length && 'IntersectionObserver' in window) {
    var linkFor = function (id) {
      return document.querySelector('.nav-links a[href="#' + id + '"]');
    };
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = linkFor(entry.target.id);
        if (!link) return;
        if (entry.isIntersecting) {
          navLinks.forEach(function (l) { l.classList.remove('active'); });
          link.classList.add('active');
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
    sections.forEach(function (section) { spy.observe(section); });
  }

  // Reveal-on-scroll
  var revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length && 'IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in-view'); });
  }

  // Hero activity graph: draw in on arrival
  var activityGraph = document.querySelector('.hero-activity-graph');
  if (activityGraph) {
    window.requestAnimationFrame(function () {
      setTimeout(function () { activityGraph.classList.add('in-view'); }, 300);
    });
  }

  // Achievement badges: pointer-tracked 3D tilt
  var heroBadges = document.querySelectorAll('.hero-badge');
  if (heroBadges.length && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    heroBadges.forEach(function (badge) {
      badge.addEventListener('pointermove', function (e) {
        var rect = badge.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width - 0.5;
        var y = (e.clientY - rect.top) / rect.height - 0.5;
        badge.style.transform = 'rotateY(' + (x * 32) + 'deg) rotateX(' + (y * -32) + 'deg) translateZ(6px)';
      });
      badge.addEventListener('pointerleave', function () {
        badge.style.transform = '';
      });
    });
  }

  // Creative cursor: dot + lagging ring, expands over interactive elements
  var wantsCursor = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (wantsCursor) {
    var cursorDot = document.querySelector('.cursor-dot');
    var cursorRing = document.querySelector('.cursor-ring');
    document.documentElement.classList.add('cursor-active');

    var mouseX = -100, mouseY = -100, ringX = -100, ringY = -100;
    var ringScale = 1, targetScale = 1;
    document.addEventListener('mousemove', function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursorDot.style.transform = 'translate3d(' + mouseX + 'px,' + mouseY + 'px,0)';
    });

    (function tick() {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      ringScale += (targetScale - ringScale) * 0.25;
      cursorRing.style.transform = 'translate3d(' + ringX + 'px,' + ringY + 'px,0) scale(' + ringScale + ')';
      requestAnimationFrame(tick);
    })();

    var interactiveSelector = 'a, button, .btn, .icon-link, .tag, .card, .project-pill, .hero-badge, .skill-cluster';
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest(interactiveSelector)) {
        targetScale = 1.625;
        cursorRing.classList.add('is-active');
      }
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest(interactiveSelector)) {
        targetScale = 1;
        cursorRing.classList.remove('is-active');
      }
    });
  }

  // Back to top
  var backToTop = document.querySelector('.back-to-top');
  if (backToTop) {
    var toggleBackToTop = function () {
      backToTop.classList.toggle('visible', window.scrollY > 480);
    };
    window.addEventListener('scroll', toggleBackToTop, { passive: true });
    toggleBackToTop();
    backToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
})();
