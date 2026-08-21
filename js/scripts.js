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

  // ----- Shooting-star cursor ------------------------------------------------
  const physicsCursor = document.getElementById('physicsCursor');
  const cursorTrail = document.getElementById('cursorTrail');
  const finePointer = window.matchMedia('(pointer: fine)');

  if (
    finePointer.matches &&
    !prefersReducedMotion.matches &&
    physicsCursor && cursorTrail
  ) {
    const trailCtx = cursorTrail.getContext('2d');
    if (trailCtx) {
      const state = {
        mouseX: window.innerWidth / 2,
        mouseY: window.innerHeight / 2,
        previousMouseX: window.innerWidth / 2,
        previousMouseY: window.innerHeight / 2,
        vx: 0,
        vy: 0,
        visible: false,
      };

      const trailPoints = [];
      const sparks = [];
      const MAX_POINTS = 26;
      const MAX_SPARKS = 36;
      let dpr = Math.min(window.devicePixelRatio || 1, 2);

      function resizeTrailCanvas() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        cursorTrail.width = Math.round(window.innerWidth * dpr);
        cursorTrail.height = Math.round(window.innerHeight * dpr);
        cursorTrail.style.width = `${window.innerWidth}px`;
        cursorTrail.style.height = `${window.innerHeight}px`;
        trailCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      resizeTrailCanvas();
      window.addEventListener('resize', resizeTrailCanvas, { passive: true });

      function primaryRGB() {
        const raw = getComputedStyle(document.documentElement)
          .getPropertyValue('--primary-rgb')
          .trim();
        return raw || '48,120,255';
      }

      function addTrailPoint(x, y, speed) {
        trailPoints.push({
          x,
          y,
          speed,
          life: 1,
          decay: 0.050 + Math.random() * 0.014,
        });
        if (trailPoints.length > MAX_POINTS) trailPoints.shift();
      }

      function emitSparks(x, y, vx, vy) {
        const speed = Math.hypot(vx, vy);
        if (speed < 3) return;

        const angle = Math.atan2(vy, vx) + Math.PI;
        const count = Math.min(3, 1 + Math.floor(speed / 14));
        for (let i = 0; i < count; i += 1) {
          const spread = (Math.random() - 0.5) * 0.65;
          const magnitude = 0.9 + Math.random() * Math.min(speed * 0.08, 2.6);
          sparks.push({
            x,
            y,
            vx: Math.cos(angle + spread) * magnitude,
            vy: Math.sin(angle + spread) * magnitude,
            life: 1,
            decay: 0.035 + Math.random() * 0.025,
            radius: 1.2 + Math.random() * 1.8,
          });
        }
        if (sparks.length > MAX_SPARKS) sparks.splice(0, sparks.length - MAX_SPARKS);
      }

      document.addEventListener('pointermove', e => {
        const dx = e.clientX - state.previousMouseX;
        const dy = e.clientY - state.previousMouseY;
        state.previousMouseX = e.clientX;
        state.previousMouseY = e.clientY;
        state.mouseX = e.clientX;
        state.mouseY = e.clientY;
        state.vx = dx;
        state.vy = dy;

        const speed = Math.hypot(dx, dy);
        addTrailPoint(e.clientX, e.clientY, speed);
        emitSparks(e.clientX, e.clientY, dx, dy);

        if (!state.visible) {
          state.visible = true;
          physicsCursor.classList.remove('is-hidden');
          body.classList.add('physics-cursor-enabled');
        }
      }, { passive: true });

      document.documentElement.addEventListener('mouseleave', () => {
        state.visible = false;
        physicsCursor.classList.add('is-hidden');
      });

      document.documentElement.addEventListener('mouseenter', () => {
        if (state.visible) physicsCursor.classList.remove('is-hidden');
      });

      const hoverSelector = 'a, button, .spotlight-card, .project-card, .article-card';
      document.addEventListener('pointerover', e => {
        if (e.target.closest(hoverSelector)) physicsCursor.classList.add('is-hovering');
      });
      document.addEventListener('pointerout', e => {
        if (e.target.closest(hoverSelector)) physicsCursor.classList.remove('is-hovering');
      });
      document.addEventListener('pointerdown', () => {
        physicsCursor.classList.add('is-pressed');
      });
      document.addEventListener('pointerup', () => {
        physicsCursor.classList.remove('is-pressed');
      });

      function drawTrail() {
        trailCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        const rgb = primaryRGB();

        for (let i = trailPoints.length - 1; i >= 0; i -= 1) {
          const p = trailPoints[i];
          p.life -= p.decay;
          if (p.life <= 0) {
            trailPoints.splice(i, 1);
          }
        }

        if (trailPoints.length > 1) {
          trailCtx.lineCap = 'round';
          trailCtx.lineJoin = 'round';
          for (let i = 1; i < trailPoints.length; i += 1) {
            const prev = trailPoints[i - 1];
            const curr = trailPoints[i];
            const life = curr.life;
            const width = Math.max(1.2, 1.4 + life * 5 + Math.min(curr.speed * 0.02, 2.4));
            trailCtx.beginPath();
            trailCtx.moveTo(prev.x, prev.y);
            trailCtx.lineTo(curr.x, curr.y);
            trailCtx.strokeStyle = `rgba(${rgb}, ${0.05 + life * 0.42})`;
            trailCtx.shadowBlur = 16;
            trailCtx.shadowColor = `rgba(${rgb}, ${life * 0.30})`;
            trailCtx.lineWidth = width;
            trailCtx.stroke();
          }
        }

        for (let i = sparks.length - 1; i >= 0; i -= 1) {
          const s = sparks[i];
          s.x += s.vx;
          s.y += s.vy;
          s.vx *= 0.93;
          s.vy *= 0.93;
          s.life -= s.decay;
          s.radius *= 0.986;

          if (s.life <= 0 || s.radius < 0.35) {
            sparks.splice(i, 1);
            continue;
          }

          trailCtx.beginPath();
          trailCtx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
          trailCtx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, s.life) * 0.85})`;
          trailCtx.shadowBlur = 10;
          trailCtx.shadowColor = `rgba(${rgb}, ${Math.max(0, s.life) * 0.55})`;
          trailCtx.fill();
        }
        trailCtx.shadowBlur = 0;
      }

      function animateShootingStarCursor() {
        const speed = Math.hypot(state.vx, state.vy);
        const angle = speed > 0.08 ? Math.atan2(state.vy, state.vx) * 180 / Math.PI : 0;
        const tailScale = 1 + Math.min(speed / 18, 1.45);
        physicsCursor.style.setProperty('--cursor-angle', `${angle}deg`);
        physicsCursor.style.setProperty('--tail-scale', tailScale.toFixed(3));
        physicsCursor.style.transform = `translate3d(${state.mouseX}px, ${state.mouseY}px, 0)`;

        drawTrail();
        requestAnimationFrame(animateShootingStarCursor);
      }

      physicsCursor.classList.add('is-hidden');
      animateShootingStarCursor();
    }
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
