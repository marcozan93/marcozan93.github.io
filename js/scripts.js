(() => {
  'use strict';

  const html = document.documentElement;
  const body = document.body;
  const themeToggle = document.getElementById('darkModeToggle');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // ----- Theme -------------------------------------------------------------
  function syncThemeUI() {
    const dark = html.dataset.theme === 'dark';
    themeToggle.innerHTML = dark
      ? '<i class="fa-solid fa-sun" aria-hidden="true"></i>'
      : '<i class="fa-solid fa-moon" aria-hidden="true"></i>';
    themeToggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    themeMeta?.setAttribute('content', dark ? '#080a0f' : '#f7f8fb');
  }

  syncThemeUI();
  themeToggle.addEventListener('click', () => {
    const next = html.dataset.theme === 'dark' ? 'light' : 'dark';
    html.dataset.theme = next;
    localStorage.setItem('theme', next);
    syncThemeUI();
  });

  // ----- Mobile navigation -------------------------------------------------
  const mobileToggle = document.getElementById('mobileMenuToggle');
  const mainNav = document.getElementById('mainNav');
  const navLinks = [...document.querySelectorAll('.nav-link')];

  function setMenu(open) {
    mainNav.classList.toggle('open', open);
    mobileToggle.setAttribute('aria-expanded', String(open));
    mobileToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    body.classList.toggle('menu-open', open);
  }

  mobileToggle.addEventListener('click', () => setMenu(!mainNav.classList.contains('open')));
  navLinks.forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  // ----- Scroll progress + back to top ------------------------------------
  const progress = document.getElementById('scrollProgress');
  const backToTop = document.getElementById('backToTop');

  function onScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    progress.style.width = `${pct}%`;
    backToTop.classList.toggle('show', window.scrollY > 600);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: prefersReducedMotion.matches ? 'auto' : 'smooth' }));

  // ----- Reveal animations -------------------------------------------------
  document.querySelectorAll('[data-reveal-delay]').forEach(el => {
    el.style.setProperty('--reveal-delay', `${Number(el.dataset.revealDelay) || 0}ms`);
  });

  const revealEls = [...document.querySelectorAll('.reveal')];
  if (prefersReducedMotion.matches || !('IntersectionObserver' in window)) {
    revealEls.forEach(el => el.classList.add('visible'));
  } else {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px' });
    revealEls.forEach(el => revealObserver.observe(el));
  }

  // ----- Active navigation -------------------------------------------------
  const sections = [...document.querySelectorAll('main section[id]')];
  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver(entries => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      navLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${visible.target.id}`));
    }, { threshold: [0.18, 0.35, 0.55], rootMargin: '-18% 0px -58%' });
    sections.forEach(section => sectionObserver.observe(section));
  }

  // ----- Spotlight cards ---------------------------------------------------
  document.querySelectorAll('.spotlight-card').forEach(card => {
    card.addEventListener('pointermove', e => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      card.style.setProperty('--my', `${e.clientY - rect.top}px`);
    });
  });

  // ----- Custom lambda cursor ---------------------------------------------
  const cursor = document.getElementById('mathCursor');
  const cursorDot = document.getElementById('mathCursorDot');
  const finePointer = window.matchMedia('(pointer: fine)');

  if (finePointer.matches && !prefersReducedMotion.matches && cursor && cursorDot) {
    body.classList.add('custom-cursor-enabled');
    let mouseX = -100;
    let mouseY = -100;
    let ringX = -100;
    let ringY = -100;

    document.addEventListener('pointermove', e => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursorDot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
    }, { passive: true });

    const hoverSelector = 'a, button, .spotlight-card';
    document.addEventListener('pointerover', e => {
      if (e.target.closest(hoverSelector)) cursor.classList.add('is-hovering');
    });
    document.addEventListener('pointerout', e => {
      if (e.target.closest(hoverSelector)) cursor.classList.remove('is-hovering');
    });

    function animateCursor() {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      cursor.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      requestAnimationFrame(animateCursor);
    }
    animateCursor();
  }

  // ----- Small magnetic movement on primary controls ----------------------
  if (finePointer.matches && !prefersReducedMotion.matches) {
    document.querySelectorAll('.magnetic').forEach(el => {
      el.addEventListener('pointermove', e => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        el.style.transform = `translate(${x * 0.08}px, ${y * 0.12}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  // ----- Mathematical vector field ----------------------------------------
  // Base field: X(x,y)=(-y,x), a rotational vector field. The pointer adds
  // a local perturbation so the field responds to the user without losing
  // its underlying mathematical structure.
  const canvas = document.getElementById('vectorField');
  const hero = document.getElementById('about');

  if (canvas && hero) {
    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let pointerX = -9999;
    let pointerY = -9999;
    let pointerActive = false;
    let raf = null;

    function resizeCanvas() {
      const rect = hero.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawField(performance.now());
    }

    hero.addEventListener('pointermove', e => {
      const rect = hero.getBoundingClientRect();
      pointerX = e.clientX - rect.left;
      pointerY = e.clientY - rect.top;
      pointerActive = true;
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { pointerActive = false; });

    function arrow(x, y, angle, length, alpha, colour) {
      const head = Math.max(3.5, length * 0.28);
      const x2 = x + Math.cos(angle) * length;
      const y2 = y + Math.sin(angle) * length;

      ctx.strokeStyle = colour(alpha);
      ctx.lineWidth = 1.15;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
    }

    function drawField(time = 0) {
      ctx.clearRect(0, 0, width, height);
      const dark = html.dataset.theme === 'dark';
      const colour = dark
        ? a => `rgba(109,160,255,${a})`
        : a => `rgba(47,109,246,${a})`;

      const spacing = width < 620 ? 46 : 42;
      const cx = width * 0.68;
      const cy = height * 0.48;
      const breathe = prefersReducedMotion.matches ? 1 : 1 + Math.sin(time * 0.00055) * 0.035;

      for (let x = spacing * .55; x < width; x += spacing) {
        for (let y = spacing * .55; y < height; y += spacing) {
          // Coordinates around the rotational field centre.
          const rx = (x - cx) / Math.max(width, 1);
          const ry = (y - cy) / Math.max(height, 1);
          let vx = -ry;
          let vy = rx;

          // Local cursor perturbation: a small attractive component.
          if (pointerActive) {
            const dx = pointerX - x;
            const dy = pointerY - y;
            const dist2 = dx * dx + dy * dy;
            const influence = Math.exp(-dist2 / 42000) * 0.22;
            const norm = Math.hypot(dx, dy) || 1;
            vx += (dx / norm) * influence;
            vy += (dy / norm) * influence;
          }

          const angle = Math.atan2(vy, vx);
          const radius = Math.hypot(rx, ry);
          const length = Math.min(16, 9 + radius * 9) * breathe;
          const baseAlpha = dark ? 0.39 : 0.24;
          const alpha = Math.min(dark ? .62 : .40, baseAlpha + radius * .11);
          arrow(x, y, angle, length, alpha, colour);
        }
      }
    }

    function loop(time) {
      drawField(time);
      raf = requestAnimationFrame(loop);
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });

    // Repaint immediately when theme changes.
    const themeObserver = new MutationObserver(() => drawField(performance.now()));
    themeObserver.observe(html, { attributes: true, attributeFilter: ['data-theme'] });

    if (prefersReducedMotion.matches) drawField(0);
    else loop(performance.now());

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && raf) {
        cancelAnimationFrame(raf);
        raf = null;
      } else if (!document.hidden && !prefersReducedMotion.matches && !raf) {
        raf = requestAnimationFrame(loop);
      }
    });
  }
})();
