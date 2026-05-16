document.addEventListener('DOMContentLoaded', () => {
  // ── CANVAS PARTICLES ──
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  // Reduce particles on mobile for perf
  const isMobile = () => window.innerWidth < 768;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  resize();
  window.addEventListener('resize', resize);

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * W;
      this.y = Math.random() * H;
      this.r = Math.random() * 1.5 + 0.5;
      this.vx = (Math.random() - 0.5) * 0.3;
      this.vy = (Math.random() - 0.5) * 0.3;
      this.alpha = Math.random() * 0.3 + 0.05;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > W || this.y < 0 || this.y > H) this.reset();
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(111,48,198,${this.alpha})`;
      ctx.fill();
    }
  }

  const particleCount = isMobile() ? 40 : 80;
  for (let i = 0; i < particleCount; i++) particles.push(new Particle());

  function drawConnections() {
    if (isMobile()) return; // Skip on mobile for performance
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(111,48,198,${0.06 * (1 - d / 120)})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
    drawConnections();
    requestAnimationFrame(animate);
  }
  animate();

  // ── NAV SCROLL ──
  const mainNav = document.getElementById('main-nav');
  window.addEventListener('scroll', () => {
    if (mainNav) mainNav.classList.toggle('scrolled', window.scrollY > 60);
  });

  // ── MOBILE NAV DRAWER ──
  const menuToggle = document.getElementById('menu-toggle');
  const navLinks = document.getElementById('nav-links');
  const navOverlay = document.getElementById('nav-overlay');

  function openNav() {
    if (navLinks) navLinks.classList.add('open');
    if (navOverlay) navOverlay.classList.add('open');
    if (menuToggle) menuToggle.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeNav() {
    if (navLinks) navLinks.classList.remove('open');
    if (navOverlay) navOverlay.classList.remove('open');
    if (menuToggle) menuToggle.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      if (navLinks) {
        navLinks.classList.contains('open') ? closeNav() : openNav();
      }
    });
  }

  if (navOverlay) navOverlay.addEventListener('click', closeNav);

  // Close on any nav link click
  if (navLinks) {
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', closeNav);
    });
  }

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeNav();
  });

// ── COUNTER ANIMATION ──
function animateCount(el, target) {
  let start = 0;
  const dur = 1800;
  const t0 = performance.now();
  function step(now) {
    const progress = Math.min((now - t0) / dur, 1);
    const ease = 1 - Math.pow(1 - progress, 4);
    el.textContent = Math.round(ease * target);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target + (target > 10 ? '+' : '');
  }
  requestAnimationFrame(step);
}

// ── INTERSECTION OBSERVER ──
const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal, .feature-card, .step-item, .team-card, .supervisor-card').forEach(el => io.observe(el));

// Stats counter
const statsIO = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('[data-count]').forEach(el => {
        animateCount(el, parseInt(el.dataset.count));
      });
      statsIO.unobserve(entry.target);
    }
  });
}, { threshold: 0.4 });

const statsBar = document.querySelector('.stats-bar');
if (statsBar) statsIO.observe(statsBar);

// ── WAVE BARS STAGGER ──
document.querySelectorAll('.wave-bar').forEach((bar, i) => {
  bar.style.animationDelay = (i * 0.1) + 's';
});

// ── STEP ITEMS STAGGER ──
document.querySelectorAll('.step-item').forEach((item, i) => {
  item.style.transitionDelay = (i * 0.12) + 's';
});

// ── FEATURE CARDS STAGGER ──
document.querySelectorAll('.feature-card').forEach((card, i) => {
  card.style.transitionDelay = (i * 0.08) + 's';
});

// ── TEAM CARDS STAGGER ──
document.querySelectorAll('.team-card').forEach((card, i) => {
  card.style.transitionDelay = (i * 0.1) + 's';
});

// ── SMOOTH SCROLL ──
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (href === '#') return;
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      // Offset for fixed nav
      const navH = document.getElementById('main-nav').offsetHeight;
      const top = target.getBoundingClientRect().top + window.scrollY - navH - 8;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

// ── PREVENT BODY SCROLL ON RESIZE if drawer open ──
window.addEventListener('resize', () => {
  if (window.innerWidth > 900) closeNav();
});
});