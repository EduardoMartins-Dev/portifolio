/* ================================================================
   EDUARDO MARTINS BARBOSA — Cybersecurity Portfolio
   Main JavaScript
   ================================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initTypingEffect();
  initNavbar();
  initScrollAnimations();
  initBackToTop();
  initContactForm();
  initLightbox();
});

/* ----------------------------------------------------------------
   PARTICLE BACKGROUND (Canvas)
   ---------------------------------------------------------------- */
function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let particles = [];
  let animationId;

  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }

  resize();
  window.addEventListener('resize', resize);

  const PARTICLE_COUNT = Math.min(80, Math.floor(canvas.width * canvas.height / 15000));

  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 2 + 0.5;
      this.speedX = (Math.random() - 0.5) * 0.5;
      this.speedY = (Math.random() - 0.5) * 0.5;
      this.opacity = Math.random() * 0.5 + 0.1;
    }

    update() {
      this.x += this.speedX;
      this.y += this.speedY;

      if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
      if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(168, 85, 247, ${this.opacity})`;
      ctx.fill();
    }
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle());
  }

  function drawLines() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 150) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(168, 85, 247, ${0.1 * (1 - dist / 150)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      p.update();
      p.draw();
    });

    drawLines();
    animationId = requestAnimationFrame(animate);
  }

  // Only animate when hero is visible
  const heroObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animate();
      } else {
        cancelAnimationFrame(animationId);
      }
    });
  }, { threshold: 0 });

  heroObserver.observe(document.getElementById('hero'));
}

/* ----------------------------------------------------------------
   TYPING EFFECT (Terminal)
   ---------------------------------------------------------------- */
function initTypingEffect() {
  const nameEl = document.getElementById('typedName');
  const roleEl = document.getElementById('typedRole');

  if (!nameEl || !roleEl) return;

  const nameText = 'Eduardo Martins Barbosa';
  const roleText = 'Pentester | Red Team & Exploit Development';

  function typeText(element, text, speed, callback) {
    let i = 0;
    element.textContent = '';
    function type() {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
        setTimeout(type, speed);
      } else {
        if (callback) callback();
      }
    }
    type();
  }

  // Start typing after a short delay
  setTimeout(() => {
    typeText(nameEl, nameText, 50, () => {
      nameEl.classList.add('glitch');
      setTimeout(() => nameEl.classList.remove('glitch'), 600);
      setTimeout(() => {
        typeText(roleEl, roleText, 35);
      }, 300);
    });
  }, 800);
}

/* ----------------------------------------------------------------
   NAVBAR
   ---------------------------------------------------------------- */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  const navItems = links.querySelectorAll('a');

  // Hamburger toggle
  toggle.addEventListener('click', () => {
    const isOpen = links.classList.toggle('open');
    toggle.classList.toggle('open');
    toggle.setAttribute('aria-expanded', isOpen);
  });

  // Close on link click
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      links.classList.remove('open');
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });

  // Scroll effects
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;

    // Add shadow on scroll
    navbar.classList.toggle('scrolled', currentScroll > 50);

    // Active link highlight
    updateActiveLink();
    lastScroll = currentScroll;
  }, { passive: true });

  function updateActiveLink() {
    const sections = document.querySelectorAll('section[id]');
    const scrollPos = window.scrollY + 100;

    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');

      if (scrollPos >= top && scrollPos < top + height) {
        navItems.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          }
        });
      }
    });
  }
}

/* ----------------------------------------------------------------
   SCROLL ANIMATIONS (Intersection Observer)
   ---------------------------------------------------------------- */
function initScrollAnimations() {
  const elements = document.querySelectorAll('[data-aos]');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  elements.forEach(el => observer.observe(el));
}

/* ----------------------------------------------------------------
   BACK TO TOP BUTTON
   ---------------------------------------------------------------- */
function initBackToTop() {
  const btn = document.getElementById('backToTop');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 500);
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ----------------------------------------------------------------
   CONTACT FORM (Demo)
   ---------------------------------------------------------------- */
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();

    const name = form.querySelector('#formName').value.trim();
    const email = form.querySelector('#formEmail').value.trim();
    const message = form.querySelector('#formMessage').value.trim();

    if (!name || !email || !message) return;

    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;

    btn.innerHTML = '<i class="fas fa-check"></i> Mensagem Enviada!';
    btn.style.background = 'var(--accent-secondary)';
    btn.disabled = true;

    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.background = '';
      btn.disabled = false;
      form.reset();
    }, 3000);
  });
}

/* ----------------------------------------------------------------
   LIGHTBOX
   ---------------------------------------------------------------- */
function initLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;

  const img = document.getElementById('lightboxImg');
  const caption = document.getElementById('lightboxCaption');
  const counter = document.getElementById('lightboxCounter');
  const closeBtn = document.getElementById('lightboxClose');
  const prevBtn = document.getElementById('lightboxPrev');
  const nextBtn = document.getElementById('lightboxNext');

  let currentGroup = [];
  let currentIndex = 0;

  function buildGroup(group) {
    return Array.from(document.querySelectorAll(`[data-lightbox="${group}"]`));
  }

  function open(images, index) {
    currentGroup = images;
    currentIndex = index;
    render();
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
    lightbox.focus();
  }

  function close() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  function render() {
    const el = currentGroup[currentIndex];
    img.src = el.src || el.dataset.src || el.getAttribute('src');
    img.alt = el.alt || '';
    caption.textContent = el.dataset.caption || el.alt || '';
    counter.textContent = `${currentIndex + 1} / ${currentGroup.length}`;
    prevBtn.style.display = currentGroup.length > 1 ? 'flex' : 'none';
    nextBtn.style.display = currentGroup.length > 1 ? 'flex' : 'none';
  }

  function prev() {
    currentIndex = (currentIndex - 1 + currentGroup.length) % currentGroup.length;
    render();
  }

  function next() {
    currentIndex = (currentIndex + 1) % currentGroup.length;
    render();
  }

  // Attach click to all lightbox images
  document.querySelectorAll('[data-lightbox]').forEach(el => {
    el.addEventListener('click', () => {
      const group = el.dataset.lightbox;
      const images = buildGroup(group);
      const index = images.indexOf(el);
      open(images, index);
    });
  });

  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);

  // Close on backdrop click
  lightbox.addEventListener('click', e => {
    if (e.target === lightbox) close();
  });

  // Keyboard navigation
  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
  });
}
