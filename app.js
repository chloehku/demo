/* ===========================================================
   CV to Website — interactive walkthrough v2
   =========================================================== */
(function () {
  'use strict';

  const STORAGE_KEY = 'cv-to-website-progress-v2';

  /* ============ STATE ============ */
  const state = {
    completed: loadProgress(),
  };

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr : []);
    } catch { return new Set(); }
  }
  function saveProgress() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.completed])); } catch {}
  }

  /* ============ DOM HELPERS ============ */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const deck = $('#deck');
  const allSlides = $$('.slide');
  const stepCards = $$('.slide[data-step]'); // excludes hero + intro dividers
  const railPips = $$('.rail-pip');
  const dotsEl = $('#dots');

  /* ============ BUILD DOT BAR ============ */
  function buildDots() {
    dotsEl.innerHTML = '';
    allSlides.forEach((sl) => {
      const id = sl.id;
      const wrap = document.createElement('div');
      wrap.className = 'dot-wrap';
      const dot = document.createElement('button');
      dot.className = 'dot';
      dot.type = 'button';
      dot.dataset.target = '#' + id;
      dot.setAttribute('aria-label', `Jump to ${sl.querySelector('.slide-title, .intro-title, .hero-title')?.textContent?.trim().split(/\s+/).slice(0, 4).join(' ') || id}`);
      const label = document.createElement('span');
      label.className = 'dot-label';
      const stepEl = sl.querySelector('.slide-step-tag, .eyebrow');
      label.textContent = stepEl ? stepEl.textContent.trim() : (id === 'slide-hero' ? 'Intro' : '');
      wrap.appendChild(dot);
      wrap.appendChild(label);
      dot.addEventListener('click', () => {
        const target = document.getElementById(id);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      dotsEl.appendChild(wrap);
    });
  }

  /* ============ CHECKBOXES + PROGRESS ============ */
  function bindCheckboxes() {
    stepCards.forEach((card) => {
      const cb = card.querySelector('.check-input');
      if (!cb) return;
      const id = card.id;
      cb.checked = state.completed.has(id);
      if (cb.checked) card.classList.add('is-completed');

      cb.addEventListener('change', () => {
        if (cb.checked) {
          state.completed.add(id);
          card.classList.add('is-completed');
        } else {
          state.completed.delete(id);
          card.classList.remove('is-completed');
        }
        saveProgress();
        renderAll();
      });
    });
  }

  /* ============ PROGRESS RENDER ============ */
  function renderAll() {
    // Topbar percent
    const total = stepCards.length;
    const done = state.completed.size;
    const pct = total ? Math.round((done / total) * 100) : 0;
    $('#topbar-pct').textContent = pct + '%';
    $('#topbar-progress-fill').style.width = pct + '%';
    $('#rail-progress-fill').style.width = pct + '%';

    // Per-step counts
    const counts = { 1: [0, 0], 2: [0, 0], 3: [0, 0] };
    stepCards.forEach((c) => {
      const s = c.dataset.step;
      if (!counts[s]) return;
      counts[s][1]++;
      if (state.completed.has(c.id)) counts[s][0]++;
    });
    document.querySelectorAll('[data-step-count]').forEach((el) => {
      const s = el.dataset.stepCount;
      const c = counts[s];
      if (c) el.textContent = `${c[0]}/${c[1]}`;
    });
    // Rail pip completion state
    Object.keys(counts).forEach((s) => {
      const c = counts[s];
      const pip = document.querySelector(`.rail-pip[data-step="${s}"]`);
      if (pip && c[0] === c[1] && c[1] > 0) pip.classList.add('is-done');
      else pip?.classList.remove('is-done');
    });

    // Dots state
    $$('.dot', dotsEl).forEach((dot, i) => {
      const slideId = allSlides[i]?.id;
      const isDone = slideId && state.completed.has(slideId);
      dot.classList.toggle('is-done', !!isDone);
    });
  }

  /* ============ SCROLL SPY ============ */
  function setupScrollSpy() {
    if (!('IntersectionObserver' in window)) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.intersectionRatio < 0.6) return;
        const id = entry.target.id;
        // Active topbar pip (only main steps, not hero/intros)
        const step = entry.target.dataset.step;
        railPips.forEach((p) => p.classList.toggle('is-active', p.dataset.step === step && !!step));
        // Active dot
        $$('.dot', dotsEl).forEach((dot) => {
          dot.classList.toggle('is-current', dot.dataset.target === '#' + id);
        });
      });
    }, { threshold: [0.5, 0.7] });
    allSlides.forEach((s) => obs.observe(s));
  }

  /* ============ JUMP BUTTONS ============ */
  function bindJumps() {
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-jump]');
      if (!target) return;
      e.preventDefault();
      const id = target.dataset.jump;
      const dest = document.getElementById(id);
      if (dest) dest.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /* ============ LIGHTBOX ============ */
  const lb = {
    box: $('#lightbox'),
    img: $('#lb-img'),
    cap: $('#lb-cap'),
    close: $('.lb-close'),
    prev: $('.lb-prev'),
    next: $('.lb-next'),
    figs: $$('[data-lightbox]'),
    idx: -1,
    open(i) {
      this.idx = i;
      const f = this.figs[i];
      this.img.src = f.dataset.lightbox;
      this.img.alt = f.querySelector('img')?.alt || '';
      this.cap.textContent = f.dataset.caption || '';
      this.box.classList.add('is-open');
      this.box.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    },
    closeFn() {
      this.box.classList.remove('is-open');
      this.box.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      this.idx = -1;
    },
    nav(d) {
      if (this.idx < 0) return;
      this.open((this.idx + d + this.figs.length) % this.figs.length);
    },
  };
  lb.figs.forEach((fig, i) => fig.addEventListener('click', () => lb.open(i)));
  lb.close.addEventListener('click', () => lb.closeFn());
  lb.prev.addEventListener('click', () => lb.nav(-1));
  lb.next.addEventListener('click', () => lb.nav(1));
  lb.box.addEventListener('click', (e) => { if (e.target === lb.box) lb.closeFn(); });

  /* ============ SHORTCUTS MODAL ============ */
  const modal = {
    box: $('#shortcuts'),
    open: $('#shortcut-btn'),
    close: $('.modal-close'),
    show() { this.box.classList.add('is-open'); this.box.setAttribute('aria-hidden', 'false'); },
    hide() { this.box.classList.remove('is-open'); this.box.setAttribute('aria-hidden', 'true'); },
  };
  modal.open.addEventListener('click', () => modal.show());
  modal.close.addEventListener('click', () => modal.hide());
  modal.box.addEventListener('click', (e) => { if (e.target === modal.box) modal.hide(); });

  /* ============ RESET ============ */
  $('#reset-btn').addEventListener('click', () => {
    if (!confirm('Reset all progress? This will untick every card.')) return;
    state.completed.clear();
    saveProgress();
    $$('.check-input').forEach((cb) => cb.checked = false);
    $$('.slide').forEach((s) => s.classList.remove('is-completed'));
    renderAll();
  });

  /* ============ KEYBOARD ============ */
  let toastShown = false;

  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    // Inside lightbox
    if (lb.box.classList.contains('is-open')) {
      if (e.key === 'Escape') lb.closeFn();
      else if (e.key === 'ArrowLeft') lb.nav(-1);
      else if (e.key === 'ArrowRight') lb.nav(1);
      return;
    }
    // Modal
    if (modal.box.classList.contains('is-open')) {
      if (e.key === 'Escape') modal.hide();
      return;
    }

    // Slide navigation — find the slide most under the viewport center
    const vhMid = deck.scrollTop + deck.clientHeight / 2;
    let bestIdx = 0, bestDist = Infinity;
    allSlides.forEach((s, i) => {
      const top = s.offsetTop;
      const mid = top + s.offsetHeight / 2;
      const d = Math.abs(mid - vhMid);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    });

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      const next = Math.min(allSlides.length - 1, bestIdx + 1);
      scrollToSlide(next);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      const prev = Math.max(0, bestIdx - 1);
      scrollToSlide(prev);
    } else if (e.key === 'Home') {
      e.preventDefault();
      scrollToSlide(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      scrollToSlide(allSlides.length - 1);
    } else if (e.key === '1') {
      e.preventDefault();
      scrollToFirstOfStep('1');
    } else if (e.key === '2') {
      e.preventDefault();
      scrollToFirstOfStep('2');
    } else if (e.key === '3') {
      e.preventDefault();
      scrollToFirstOfStep('3');
    } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
      e.preventDefault();
      modal.show();
    } else if (!toastShown && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      // (handled above)
    }
  });

  function scrollToSlide(idx) {
    const target = allSlides[idx];
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function scrollToFirstOfStep(step) {
    const target = document.getElementById(`slide-${step}-1`) || document.getElementById(`slide-${step}-0`);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Rail pips clickable
  railPips.forEach((pip) => {
    pip.addEventListener('click', () => {
      const step = pip.dataset.step;
      scrollToFirstOfStep(step);
    });
  });

  /* ============ FIRST-RUN TOAST ============ */
  const toast = {
    el: $('#toast'),
    show() {
      if (toastShown) return;
      toastShown = true;
      try { localStorage.setItem('cv-to-website-toast-shown', '1'); } catch {}
      this.el.classList.add('is-visible');
      setTimeout(() => this.el.classList.remove('is-visible'), 6000);
    },
  };
  try {
    if (!localStorage.getItem('cv-to-website-toast-shown')) {
      setTimeout(() => toast.show(), 900);
    } else {
      toastShown = true;
    }
  } catch { setTimeout(() => toast.show(), 900); }
  $('.toast-close').addEventListener('click', () => toast.el.classList.remove('is-visible'));

  /* ============ PROMPT COPY ============ */
  $$('.prompt').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const text = btn.dataset.copy || '';
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch {}
        ta.remove();
      }
      btn.classList.add('is-copied');
      btn.querySelector('.prompt-copy').textContent = '✓';
      setTimeout(() => {
        btn.classList.remove('is-copied');
        btn.querySelector('.prompt-copy').textContent = '📋';
      }, 1600);
    });
  });

  /* ============ URL REVEAL ANIMATION ============ */
  const reveal = {
    btn: $('#deploy-btn'),
    user: $('#reveal-user'),
    bar: $('#reveal-bar-fill'),
    status: $('#reveal-status'),
    usernames: ['chloemarketing', 'jdoe', 'sarah-builds', 'mlee', 'alex-builds', 'priya.dev'],
    running: false,
    pick: '',
    init() {
      if (!this.btn) return;
      this.btn.addEventListener('click', () => this.run());
    },
    run() {
      if (this.running) return;
      this.running = true;
      this.btn.classList.add('is-running');
      this.btn.querySelector('.btn-label').textContent = 'Deploying…';
      this.bar.style.width = '0%';

      const steps = [
        { pct: 12, status: 'Uploading files…', delay: 350 },
        { pct: 35, status: 'Compressing assets…', delay: 420 },
        { pct: 58, status: 'Wiring up GitHub Pages…', delay: 480 },
        { pct: 80, status: 'Assigning your URL…', delay: 500 },
        { pct: 100, status: 'Live ✓', delay: 360 },
      ];
      let acc = 0;
      steps.forEach((s) => {
        setTimeout(() => {
          this.bar.style.width = s.pct + '%';
          this.status.textContent = s.status;
        }, acc);
        acc += s.delay;
      });
      // Type username
      setTimeout(() => {
        this.pick = this.usernames[Math.floor(Math.random() * this.usernames.length)];
        this.typeIn(this.user, this.pick, 65);
      }, 800);

      setTimeout(() => {
        this.running = false;
        this.btn.classList.remove('is-running');
        this.btn.querySelector('.btn-label').textContent = 'Re-deploy';
      }, acc + 200);
    },
    typeIn(el, text, delay) {
      el.textContent = '';
      let i = 0;
      const tick = () => {
        if (i <= text.length) {
          el.textContent = text.slice(0, i);
          i++;
          setTimeout(tick, delay);
        }
      };
      tick();
    },
  };
  reveal.init();

  /* ============ CONFETTI ============ */
  const confetti = {
    canvas: $('#confetti'),
    running: false,
    init() {
      const btn = $('#celebrate-btn');
      if (!btn) return;
      btn.addEventListener('click', () => this.fire());
    },
    fire() {
      if (this.running) return;
      this.running = true;
      const c = this.canvas;
      const dpr = window.devicePixelRatio || 1;
      const rect = c.getBoundingClientRect();
      c.width = rect.width * dpr;
      c.height = rect.height * dpr;
      const ctx = c.getContext('2d');
      ctx.scale(dpr, dpr);
      const W = rect.width, H = rect.height;
      const colors = ['#b85c3e', '#d4a574', '#5c7a4e', '#f4d9cc', '#fff3b0', '#f6e5cc', '#95452b'];
      const N = 140;
      const parts = [];
      for (let i = 0; i < N; i++) {
        parts.push({
          x: W * (0.3 + Math.random() * 0.4),
          y: H * 0.5,
          vx: (Math.random() - 0.5) * 12,
          vy: -8 - Math.random() * 6,
          g: 0.25 + Math.random() * 0.18,
          size: 6 + Math.random() * 6,
          color: colors[Math.floor(Math.random() * colors.length)],
          rot: Math.random() * Math.PI,
          vrot: (Math.random() - 0.5) * 0.3,
          life: 0,
          max: 120 + Math.random() * 60,
        });
      }
      const start = performance.now();
      const step = (t) => {
        const dt = 16;
        ctx.clearRect(0, 0, W, H);
        parts.forEach((p) => {
          p.life += dt;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += p.g;
          p.rot += p.vrot;
          const fade = Math.max(0, 1 - p.life / p.max);
          ctx.save();
          ctx.globalAlpha = fade;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size * 0.25, p.size, p.size * 0.5);
          ctx.restore();
        });
        if (t - start < 3000) requestAnimationFrame(step);
        else { ctx.clearRect(0, 0, W, H); this.running = false; }
      };
      requestAnimationFrame(step);
    },
  };
  confetti.init();

  /* ============ INIT ============ */
  buildDots();
  bindCheckboxes();
  bindJumps();
  setupScrollSpy();
  renderAll();

  // Resize confetti canvas to match slide-celebrate
  function resizeConfetti() {
    const c = confetti.canvas;
    if (!c) return;
    const r = c.getBoundingClientRect();
    c.width = r.width * (window.devicePixelRatio || 1);
    c.height = r.height * (window.devicePixelRatio || 1);
  }
  window.addEventListener('resize', resizeConfetti);
  setTimeout(resizeConfetti, 100);

})();
