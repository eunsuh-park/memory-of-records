/**
 * SaaS 마케팅 랜딩 (/)
 * Dials: VARIANCE 9 · MOTION 8 · DENSITY 2
 */

import './Landing.css';
import { render as renderButton } from '../../components/Button/Button.js';
import { render as renderField } from '../../components/FormField/FormField.js';
import { MINGCUTE } from '../../assets/mingcuteIcons.js';
import { landingContent as copy } from '../../data/landingContent.js';
import { router } from '../../router.js';
import { showToast } from '../../components/Toast/Toast.js';
import heroImg from '../../assets/landing/hero.webp';
import featuresImg from '../../assets/landing/features.webp';
import problemImg from '../../assets/landing/problem.webp';

function iconHtml(key) {
  return MINGCUTE[key] || MINGCUTE.pic2Fill;
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function bindReveal(root) {
  const nodes = root.querySelectorAll('[data-reveal]');
  if (prefersReducedMotion()) {
    nodes.forEach((el) => el.classList.add('is-visible'));
    return () => {};
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
  );
  nodes.forEach((el) => io.observe(el));
  return () => io.disconnect();
}

function bindMagneticButtons(root) {
  if (prefersReducedMotion()) return () => {};
  const cleanups = [];
  root.querySelectorAll('.landing-btn').forEach((btn) => {
    const onMove = (e) => {
      const rect = btn.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      btn.style.setProperty('--mx', `${x * 10}px`);
      btn.style.setProperty('--my', `${y * 8}px`);
    };
    const onLeave = () => {
      btn.style.setProperty('--mx', '0px');
      btn.style.setProperty('--my', '0px');
    };
    btn.addEventListener('pointermove', onMove);
    btn.addEventListener('pointerleave', onLeave);
    cleanups.push(() => {
      btn.removeEventListener('pointermove', onMove);
      btn.removeEventListener('pointerleave', onLeave);
    });
  });
  return () => cleanups.forEach((fn) => fn());
}

function playHeroEntrance(root) {
  const hero = root.querySelector('.landing-hero');
  if (!hero) return;
  if (prefersReducedMotion()) {
    hero.classList.add('is-entered');
    return;
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(() => hero.classList.add('is-entered'));
  });
}

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function renderLanding() {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  document.documentElement.classList.add('landing-page-active');
  document.body.classList.add('landing-page-active');

  const { hero, features, join } = copy;

  mainContent.innerHTML = `
    <div class="landing">
      <section class="landing-hero" aria-labelledby="landing-hero-title">
        <div class="landing-hero__copy">
          <p class="landing-hero__brand landing-hero__el" style="--enter-i:0">${hero.brand}</p>
          <h1 id="landing-hero-title" class="landing-hero__title landing-hero__el" style="--enter-i:1">${hero.headline.replace(/\n/g, '<br>')}</h1>
          <p class="landing-hero__sub landing-hero__el" style="--enter-i:2">${hero.subtext}</p>
          <div class="landing-hero__actions landing-hero__el" style="--enter-i:3">
            ${renderButton({
              shape: 'solid',
              className: 'landing-btn landing-btn--primary',
              content: `${iconHtml('mailSendLine')}<span>${hero.primaryCta}</span>`,
              ariaLabel: hero.primaryCta,
              dataset: { landing: 'waitlist' }
            })}
            ${renderButton({
              shape: 'text',
              className: 'landing-btn landing-btn--ghost',
              content: `${iconHtml('rightLine')}<span>${hero.secondaryCta}</span>`,
              ariaLabel: hero.secondaryCta,
              dataset: { landing: 'demo' }
            })}
          </div>
        </div>
        <div class="landing-hero__visual landing-hero__el" style="--enter-i:1">
          <img
            src="${heroImg}"
            alt="쌓여 있는 아날로그 노트 아카이브"
            width="1600"
            height="900"
            decoding="async"
            fetchpriority="high"
            class="landing-hero__img"
          />
        </div>
      </section>

      <section class="landing-features" id="features" aria-labelledby="landing-features-title">
        <div class="landing-features__intro" data-reveal data-reveal-from="up" style="--reveal-i:0">
          <h2 id="landing-features-title" class="landing-section-title">${features.headline}</h2>
          <p class="landing-section-body">${features.lede}</p>
        </div>
        <div class="landing-bento">
          <article class="landing-bento__cell landing-bento__cell--photo" data-reveal data-reveal-from="scale" style="--reveal-i:1">
            <img
              src="${featuresImg}"
              alt="노트 표지 모음"
              width="1200"
              height="1200"
              loading="lazy"
              decoding="async"
              class="landing-bento__img"
            />
            <div class="landing-bento__overlay">
              <span class="landing-bento__icon" aria-hidden="true">${iconHtml(features.items[0].icon)}</span>
              <h3 class="landing-bento__title">${features.items[0].title}</h3>
              <p class="landing-bento__body">${features.items[0].body}</p>
            </div>
          </article>
          <article class="landing-bento__cell landing-bento__cell--wide" data-reveal data-reveal-from="left" style="--reveal-i:2">
            <img
              src="${problemImg}"
              alt="펼친 노트와 레코드 슬리브"
              width="1200"
              height="900"
              loading="lazy"
              decoding="async"
              class="landing-bento__side-img"
            />
            <div class="landing-bento__side-copy">
              <span class="landing-bento__icon" aria-hidden="true">${iconHtml(features.items[1].icon)}</span>
              <h3 class="landing-bento__title">${features.items[1].title}</h3>
              <p class="landing-bento__body">${features.items[1].body}</p>
            </div>
          </article>
          <article class="landing-bento__cell landing-bento__cell--ink" data-reveal data-reveal-from="up" style="--reveal-i:3">
            <span class="landing-bento__icon" aria-hidden="true">${iconHtml(features.items[2].icon)}</span>
            <h3 class="landing-bento__title">${features.items[2].title}</h3>
            <p class="landing-bento__body">${features.items[2].body}</p>
          </article>
        </div>
      </section>

      <section class="landing-join" id="demo" aria-labelledby="landing-join-demo-title">
        <div class="landing-join__demo" data-reveal data-reveal-from="left" style="--reveal-i:0">
          <h2 id="landing-join-demo-title" class="landing-join__title">${join.demoHeadline}</h2>
          <p class="landing-join__body">${join.demoBody}</p>
          ${renderButton({
            shape: 'solid',
            className: 'landing-btn landing-btn--primary landing-btn--on-dark',
            content: `${iconHtml('rightLine')}<span>${join.demoCta}</span>`,
            ariaLabel: join.demoCta,
            dataset: { landing: 'demo' }
          })}
        </div>
        <div class="landing-join__waitlist" id="waitlist" data-reveal data-reveal-from="up" style="--reveal-i:1">
          <h2 class="landing-join__title landing-join__title--light">${join.waitlistHeadline}</h2>
          <p class="landing-join__body landing-join__body--muted">${join.waitlistBody}</p>
          <form class="landing-waitlist__form" novalidate>
            ${renderField({
              type: 'email',
              label: join.emailLabel,
              name: 'email',
              required: true,
              placeholder: join.emailPlaceholder,
              autocomplete: 'email',
              inputClassName: 'landing-waitlist__input',
              className: 'landing-waitlist__field'
            })}
            ${renderButton({
              shape: 'solid',
              type: 'submit',
              className: 'landing-btn landing-btn--primary landing-waitlist__submit',
              content: `${iconHtml('mailSendLine')}<span>${join.submit}</span>`,
              ariaLabel: join.submit
            })}
          </form>
          <p class="landing-waitlist__note">${join.pricingNote}</p>
          <p class="landing-waitlist__status" role="status" aria-live="polite"></p>
        </div>
      </section>
    </div>
  `;

  playHeroEntrance(mainContent);
  const cleanupReveal = bindReveal(mainContent);
  const cleanupMagnetic = bindMagneticButtons(mainContent);

  mainContent.querySelectorAll('[data-landing="waitlist"]').forEach((btn) => {
    btn.addEventListener('click', () => scrollToId('waitlist'));
  });

  mainContent.querySelectorAll('[data-landing="demo"]').forEach((btn) => {
    btn.addEventListener('click', () => router.navigate('/timeline'));
  });

  const form = mainContent.querySelector('.landing-waitlist__form');
  const statusEl = mainContent.querySelector('.landing-waitlist__status');
  const emailInput = mainContent.querySelector('input[name="email"]');

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = String(emailInput?.value || '').trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (statusEl) {
        statusEl.textContent = '올바른 이메일을 입력해 주세요.';
        statusEl.classList.add('is-error');
      }
      return;
    }
    if (statusEl) {
      statusEl.textContent = join.success;
      statusEl.classList.remove('is-error');
    }
    showToast('얼리 액세스 신청이 준비되었습니다');
    const subject = encodeURIComponent('Memory of Records 얼리 액세스');
    const body = encodeURIComponent(`얼리 액세스를 신청합니다.\n이메일: ${email}`);
    window.location.href = `mailto:${join.mailto}?subject=${subject}&body=${body}`;
    if (emailInput) emailInput.value = '';
  });

  mainContent.__landingCleanup = () => {
    cleanupReveal();
    cleanupMagnetic();
  };
}
