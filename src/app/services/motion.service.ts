import { Injectable, PLATFORM_ID, inject, ElementRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

@Injectable({
  providedIn: 'root'
})
export class MotionService {
  private platformId = inject(PLATFORM_ID);
  readonly isBrowser = isPlatformBrowser(this.platformId);

  constructor() {
    if (this.isBrowser) {
      gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
    }
  }

  /**
   * Safely create a scoped GSAP Context.
   * Cleans up all ScrollTriggers and tweens created within the scope when context.revert() is called.
   */
  createContext(scope: HTMLElement | ElementRef<HTMLElement> | undefined, callback: (ctx: gsap.Context) => void): gsap.Context | undefined {
    if (!this.isBrowser) return undefined;
    const targetScope = scope instanceof ElementRef ? scope.nativeElement : scope;
    return gsap.context(callback, targetScope);
  }

  /**
   * Animate element entrance with a smooth cinematic fade and slide up
   */
  fadeUp(targets: gsap.DOMTarget, vars: gsap.TweenVars = {}): gsap.core.Tween | undefined {
    if (!this.isBrowser) return undefined;
    return gsap.from(targets, {
      y: 35,
      opacity: 0,
      duration: 1.0,
      ease: 'power3.out',
      stagger: 0.08,
      ...vars
    });
  }

  /**
   * Split and transition every word into view with a staggered, spring-damped entrance.
   * Also enables interactive word hover & ripple effects.
   */
  splitAndAnimateWords(el: HTMLElement, options: { delay?: number; stagger?: number; trigger?: HTMLElement | string; once?: boolean } = {}): void {
    if (!this.isBrowser || !el || el.dataset['sdiocWordsSplit']) return;
    el.dataset['sdiocWordsSplit'] = 'true';

    // Store original text for screen readers while presenting living kinetic tokens
    const rawText = el.innerText.trim();
    if (!rawText) return;

    const words = rawText.split(/\s+/);
    el.innerHTML = words.map(word => {
      return `<span class="kinetic-word-wrap">` +
        `<span class="kinetic-word">${word}</span>` +
        `</span>`;
    }).join('');

    const wordSpans = el.querySelectorAll<HTMLElement>('.kinetic-word');

    gsap.fromTo(wordSpans,
      { y: 30, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.85,
        stagger: options.stagger ?? 0.035,
        ease: 'power3.out',
        delay: options.delay ?? 0,
        scrollTrigger: {
          trigger: options.trigger || el,
          start: 'top 90%',
          once: options.once !== false
        },
        clearProps: 'all'
      }
    );

    // Add gentle hover micro-elevation without clipping or scaling distortions
    wordSpans.forEach(w => {
      w.addEventListener('mouseenter', () => {
        gsap.to(w, {
          y: -2,
          duration: 0.2,
          ease: 'power2.out'
        });
      });
      w.addEventListener('mouseleave', () => {
        gsap.to(w, {
          y: 0,
          duration: 0.25,
          ease: 'power2.inOut',
          clearProps: 'transform'
        });
      });
    });
  }

  /**
   * Split and transition every character (letter/digit/symbol) into view
   * with a golden light emergence & luminous shimmer effect.
   */
  splitAndAnimateChars(el: HTMLElement, options: { delay?: number; stagger?: number; trigger?: HTMLElement | string; once?: boolean } = {}): void {
    if (!this.isBrowser || !el || el.dataset['sdiocCharsSplit']) return;
    el.dataset['sdiocCharsSplit'] = 'true';

    const text = el.innerText.trim();
    if (!text) return;

    const words = text.split(/\s+/);
    el.innerHTML = words.map(w => {
      const chars = Array.from(w).map(c =>
        `<span class="golden-char">${c}</span>`
      ).join('');
      return `<span class="golden-word-wrap">${chars}</span>`;
    }).join(' ');

    const charSpans = el.querySelectorAll<HTMLElement>('.golden-char');
    if (charSpans.length === 0) return;

    gsap.fromTo(charSpans,
      {
        opacity: 0,
        y: 12,
        scale: 0.88,
        filter: 'blur(4px) drop-shadow(0 0 12px rgba(245, 200, 75, 0.9))'
      },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: 'blur(0px) drop-shadow(0 0 0px rgba(245, 200, 75, 0))',
        duration: 0.7,
        stagger: options.stagger ?? 0.018,
        ease: 'power2.out',
        delay: options.delay ?? 0.05,
        scrollTrigger: {
          trigger: options.trigger || el,
          start: 'top 80%', // Triggers only when well into the viewport (20% above bottom), never at the very bottom edge
          once: options.once !== false
        },
        clearProps: 'transform,filter'
      }
    );

    // Interactive golden light reaction on individual letters
    charSpans.forEach(c => {
      c.addEventListener('mouseenter', () => {
        gsap.to(c, {
          color: '#ffffff',
          scale: 1.18,
          duration: 0.15,
          ease: 'power2.out',
          textShadow: '0 0 12px rgba(245, 200, 75, 1), 0 0 24px rgba(253, 240, 181, 0.8), 0 2px 4px rgba(0, 0, 0, 0.9)'
        });
      });
      c.addEventListener('mouseleave', () => {
        gsap.to(c, {
          scale: 1,
          duration: 0.35,
          ease: 'power2.out',
          clearProps: 'color,scale,textShadow'
        });
      });
    });
  }

  /**
   * Interactive 3D Card / Tile Tilt physics reacting dynamically to pointer movement
   */
  attach3DTilt(card: HTMLElement, maxTilt = 8): () => void {
    if (!this.isBrowser || !card) return () => { };

    const onMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -maxTilt;
      const rotateY = ((x - centerX) / centerX) * maxTilt;

      gsap.to(card, {
        rotateX: rotateX,
        rotateY: rotateY,
        transformPerspective: 1000,
        duration: 0.3,
        ease: 'power1.out'
      });
    };

    const onMouseLeave = () => {
      gsap.to(card, {
        rotateX: 0,
        rotateY: 0,
        duration: 0.6,
        ease: 'power2.out'
      });
    };

    card.addEventListener('mousemove', onMouseMove);
    card.addEventListener('mouseleave', onMouseLeave);

    return () => {
      card.removeEventListener('mousemove', onMouseMove);
      card.removeEventListener('mouseleave', onMouseLeave);
    };
  }

  /**
   * Magnetic Button Effect - buttons and badges softly pull toward the cursor when nearby
   */
  attachMagnetic(el: HTMLElement, pullStrength = 0.3): () => void {
    if (!this.isBrowser || !el) return () => { };

    const onMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const relX = e.clientX - (rect.left + rect.width / 2);
      const relY = e.clientY - (rect.top + rect.height / 2);

      gsap.to(el, {
        x: relX * pullStrength,
        y: relY * pullStrength,
        duration: 0.3,
        ease: 'power2.out'
      });
    };

    const onMouseLeave = () => {
      gsap.to(el, {
        x: 0,
        y: 0,
        duration: 0.5,
        ease: 'elastic.out(1, 0.4)'
      });
    };

    el.addEventListener('mousemove', onMouseMove);
    el.addEventListener('mouseleave', onMouseLeave);

    return () => {
      el.removeEventListener('mousemove', onMouseMove);
      el.removeEventListener('mouseleave', onMouseLeave);
    };
  }

  /**
   * Initializes page-wide kinetic transitions and living element reactivity for any container.
   * Scans for headings, titles, descriptions, buttons, and cards to bring them to life!
   */
  initPageAnimations(container: HTMLElement): () => void {
    if (!this.isBrowser || !container) return () => { };

    const cleanups: Array<() => void> = [];

    // 1. Transition all monumental titles (h1, h2, hero title, page titles) with letter-by-letter golden light formation
    const titles = container.querySelectorAll<HTMLElement>('h1, h2, .hero-main-title, .committee-page-title, .ministries-title, .downloads-title, .contact-title, .prayer-title, .church-header-title');
    titles.forEach(t => {
      this.splitAndAnimateChars(t, { stagger: 0.018, delay: 0.1 });
    });

    // 2. Transition secondary headings (h3, h4, section headings, shelf titles, card titles) with character-level golden shimmer
    // Triggers strictly when the specific text line itself reaches 80% viewport height
    const subheadings = container.querySelectorAll<HTMLElement>('.section-heading, .portal-title, .hierarchy-name, .member-name, .ministry-card-title, .shelf-category-title, .bento-item-headline, .card-title, .prayer-verse-text');
    subheadings.forEach(sh => {
      this.splitAndAnimateChars(sh, {
        stagger: 0.015,
        delay: 0.15,
        trigger: sh
      });
    });

    // 3. Staggered reveal & subtle hover breathing on editorial badges & tags
    const badges = container.querySelectorAll<HTMLElement>('.hero-editorial-badge, .hud-tag, .section-label, .committee-term-badge, .ministries-badge, .downloads-badge, .prayer-badge, .church-header-badge');
    if (badges.length > 0) {
      gsap.from(badges, {
        y: 20,
        opacity: 0,
        scale: 0.92,
        duration: 0.8,
        stagger: 0.08,
        ease: 'back.out(1.7)',
        scrollTrigger: {
          trigger: container,
          start: 'top 92%',
          once: true
        }
      });
    }

    // 4. Attach 3D interactive tilt physics to cards
    const tiltCards = container.querySelectorAll<HTMLElement>('.glass-panel, .glass-card, .portal-tile, .hierarchy-card, .bento-card, .member-card, .ministry-card, .horizontal-spine-codex, .liturgy-hud-card, .church-header-card, .prayer-form-glass-card');
    tiltCards.forEach(c => {
      cleanups.push(this.attach3DTilt(c, 6));
    });

    // 5. Attach magnetic physics to interactive buttons
    const magneticBtns = container.querySelectorAll<HTMLElement>('.btn-hero-primary, .btn-hero-secondary, .btn-ministry-inquire, .btn-contact-action, .btn-contact-secondary, .btn-inquiry-submit, .btn-pastoral-call, .btn-spine-read, .switch-tab-btn');
    magneticBtns.forEach(btn => {
      cleanups.push(this.attachMagnetic(btn, 0.25));
    });

    // 6. Floating ambient parallax for background icons and watermarks
    const watermarks = container.querySelectorAll<HTMLElement>('.sacred-ambient-watermark, .sacred-finial-bridge, .bridge-emblem');
    watermarks.forEach(wm => {
      gsap.to(wm, {
        y: -25,
        ease: 'none',
        scrollTrigger: {
          trigger: wm,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.5
        }
      });
    });

    return () => {
      cleanups.forEach(c => c());
    };
  }

  /**
   * Staggered word reveal for titles and monumental headers (Legacy backward compatible)
   */
  animateWords(elementOrSelector: HTMLElement | string, vars: gsap.TweenVars = {}): gsap.core.Timeline | undefined {
    if (!this.isBrowser) return undefined;
    const el = typeof elementOrSelector === 'string' ? document.querySelector(elementOrSelector) as HTMLElement : elementOrSelector;
    if (!el) return undefined;
    const delayNum = typeof vars.delay === 'number' ? vars.delay : undefined;
    const staggerNum = typeof vars.stagger === 'number' ? vars.stagger : undefined;
    this.splitAndAnimateWords(el, { delay: delayNum, stagger: staggerNum });
    return undefined;
  }


  /**
   * Smoothly scroll window or element to a specific target
   */
  scrollTo(target: string | number | HTMLElement, offset = 0): void {
    if (!this.isBrowser) return;
    gsap.to(window, {
      duration: 0.9,
      scrollTo: { y: target, offsetY: offset },
      ease: 'power3.inOut'
    });
  }

  /**
   * Trigger a refresh on ScrollTrigger (useful after dynamic content loads or route changes)
   */
  refreshScrollTrigger(): void {
    if (this.isBrowser) {
      ScrollTrigger.refresh();
    }
  }
}


