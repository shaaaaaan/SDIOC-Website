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

  private gyroListenerAttached = false;
  private gyroBeta = 0;   // Tilt Front-to-Back [-180, 180]
  private gyroGamma = 0;  // Tilt Left-to-Right [-90, 90]

  constructor() {
    if (this.isBrowser) {
      gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
      this.initGyroscope();
    }
  }



  /**
   * Initializes mobile gyroscope listener with automatic fallback to touch-drag inertial parallax
   * Drives exaggerated, rich parallax across every element on supported mobile / touch devices.
   */
  private initGyroscope(): void {
    if (!this.isBrowser || this.gyroListenerAttached) return;

    // 1. Gyroscope Orientation Listener (Active on mobile/tablet devices with sensor orientation)
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return;
      // Clamp values around resting smartphone angle (~45deg beta)
      const clampedBeta = Math.max(-40, Math.min(40, (e.beta - 45)));
      const clampedGamma = Math.max(-40, Math.min(40, e.gamma));

      this.gyroBeta = clampedBeta;
      this.gyroGamma = clampedGamma;

      this.updateGyroscopeParallax();
    };

    // Request permission or bind orientation listener
    const requestAndBindGyro = () => {
      try {
        if (typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
          (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission()
            .then(permissionState => {
              if (permissionState === 'granted') {
                window.addEventListener('deviceorientation', handleOrientation, { passive: true });
                this.gyroListenerAttached = true;
              }
            })
            .catch(() => {});
        } else if ('DeviceOrientationEvent' in window) {
          window.addEventListener('deviceorientation', handleOrientation, { passive: true });
          this.gyroListenerAttached = true;
        }
      } catch {
        // Fallback
      }
    };

    // Attempt registration
    requestAndBindGyro();

    // Bind on user gestures for iOS 13+ strict sensor permission requirement
    const onUserInteraction = () => {
      requestAndBindGyro();
    };
    window.addEventListener('touchstart', onUserInteraction, { passive: true, once: true });
    window.addEventListener('click', onUserInteraction, { passive: true, once: true });
  }

  /**
   * Drives subtle gyroscope parallax across elements, and dynamically orients
   * lighting, glow angles, auras, and specular glass reflections matching real device tilt.
   */
  private updateGyroscopeParallax(): void {
    // Subtle damping factors for parallax translation and rotation
    const tiltX = this.gyroBeta * 0.25;  // subtle rotateX / vertical shift
    const tiltY = this.gyroGamma * 0.25; // subtle rotateY / horizontal shift

    // Compute gyro lighting angle in degrees [0 to 360] and offset percentages
    // Gamma (left/right: -40 to 40), Beta (top/bottom: -40 to 40)
    const normX = Math.max(-1, Math.min(1, this.gyroGamma / 35));
    const normY = Math.max(-1, Math.min(1, this.gyroBeta / 35));
    const glowAngle = (Math.atan2(normY, normX) * (180 / Math.PI) + 90 + 360) % 360;

    // Update global root CSS custom properties for directional lighting and glows
    const root = document.documentElement;
    root.style.setProperty('--gyro-angle', `${glowAngle.toFixed(1)}deg`);
    root.style.setProperty('--gyro-x', `${(normX * 100).toFixed(1)}%`);
    root.style.setProperty('--gyro-y', `${(normY * 100).toFixed(1)}%`);
    root.style.setProperty('--gyro-offset-x', `${(normX * 24).toFixed(1)}px`);
    root.style.setProperty('--gyro-offset-y', `${(normY * 24).toFixed(1)}px`);

    // 1. Dynamic Glows, Auras & Specular Reflections (Directly steered by Gyro tilt direction)
    const dynamicGlows = document.querySelectorAll<HTMLElement>(
      '.plaque-portrait-aura, .glass-specular-reflection, .heavenly-aura-bloom, .aura-orb, .plaque-ambient-glow'
    );
    if (dynamicGlows.length > 0) {
      gsap.to(dynamicGlows, {
        x: -normX * 28,
        y: -normY * 24,
        duration: 0.35,
        ease: 'power1.out',
        overwrite: 'auto'
      });
    }

    // 2. Tier 1: Cards & Panels (Very subtle 3D tilt & soft touch)
    const cards = document.querySelectorAll<HTMLElement>(
      '.glass-card, .glass-panel, .member-card, .oval-plaque-card, .committee-card, .ministry-card, .hierarchy-card, .bento-card, .portal-tile, .liturgy-hud-card, .church-header-card, .committee-header-card, article'
    );
    if (cards.length > 0) {
      gsap.to(cards, {
        rotateX: -tiltX * 0.45,
        rotateY: tiltY * 0.45,
        x: tiltY * 0.3,
        y: tiltX * 0.25,
        transformPerspective: 1200,
        duration: 0.4,
        ease: 'power1.out',
        overwrite: 'auto'
      });
    }

    // 3. Tier 2: Watermarks, Geometric Auras & Sacred Crosses (Gentle ambient drift)
    const watermarks = document.querySelectorAll<HTMLElement>(
      '.sacred-ambient-watermark, .watermark-committee, .watermark-portals, .watermark-hierarchy, .sacred-finial-bridge, .bridge-emblem, .ambient-sacred-mesh, .cross-emblem'
    );
    if (watermarks.length > 0) {
      gsap.to(watermarks, {
        x: tiltY * 0.8,
        y: tiltX * 0.8,
        duration: 0.5,
        ease: 'power1.out',
        overwrite: 'auto'
      });
    }

    // 4. Tier 3: Background Canvas & Video
    const bgContainer = document.querySelectorAll<HTMLElement>('.ambient-video-canvas-container, .sacred-background-canvas');
    if (bgContainer.length > 0) {
      gsap.to(bgContainer, {
        x: -tiltY * 0.4,
        y: -tiltX * 0.4,
        duration: 0.6,
        ease: 'power1.out',
        overwrite: 'auto'
      });
    }
  }

  /**
   * Safely create a scoped GSAP Context.
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
   */
  splitAndAnimateWords(el: HTMLElement, options: { delay?: number; stagger?: number; trigger?: HTMLElement | string; once?: boolean } = {}): void {
    if (!this.isBrowser || !el || el.dataset['sdiocWordsSplit']) return;
    el.dataset['sdiocWordsSplit'] = 'true';

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
          start: 'top 80%',
          once: options.once !== false
        },
        clearProps: 'transform,filter'
      }
    );

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
   */
  initPageAnimations(container: HTMLElement): () => void {
    if (!this.isBrowser || !container) return () => { };

    const cleanups: Array<() => void> = [];

    // 1. Monumental titles
    const titles = container.querySelectorAll<HTMLElement>('h1, h2, .hero-main-title, .committee-page-title, .committee-header-title, .ministries-title, .downloads-title, .contact-title, .prayer-title, .church-header-title');
    titles.forEach(t => {
      this.splitAndAnimateChars(t, { stagger: 0.018, delay: 0.1 });
    });

    // 2. Secondary headings
    const subheadings = container.querySelectorAll<HTMLElement>('.section-heading, .portal-title, .hierarchy-name, .member-name, .committee-member-name, .ministry-card-title, .shelf-category-title, .bento-item-headline, .card-title, .prayer-verse-text');
    subheadings.forEach(sh => {
      this.splitAndAnimateChars(sh, {
        stagger: 0.015,
        delay: 0.15,
        trigger: sh
      });
    });

    // 3. Badges & tags
    const badges = container.querySelectorAll<HTMLElement>('.hero-editorial-badge, .hud-tag, .section-label, .committee-term-badge, .committee-header-badge, .ministries-badge, .downloads-badge, .prayer-badge, .church-header-badge');
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

    // 4. Attach 3D interactive tilt physics to cards (on mouse devices)
    const tiltCards = container.querySelectorAll<HTMLElement>('.glass-panel, .glass-card, .portal-tile, .hierarchy-card, .bento-card, .member-card, .committee-card, .ministry-card, .horizontal-spine-codex, .liturgy-hud-card, .church-header-card, .committee-header-card');
    tiltCards.forEach(c => {
      cleanups.push(this.attach3DTilt(c, 6));
    });

    // 5. Attach magnetic physics to interactive buttons
    const magneticBtns = container.querySelectorAll<HTMLElement>('.btn-hero-primary, .btn-hero-secondary, .btn-ministry-inquire, .btn-contact-action, .btn-contact-secondary, .btn-inquiry-submit, .btn-pastoral-call, .btn-spine-read, .switch-tab-btn');
    magneticBtns.forEach(btn => {
      cleanups.push(this.attachMagnetic(btn, 0.25));
    });

    // 6. Floating ambient parallax for background icons and watermarks
    const watermarks = container.querySelectorAll<HTMLElement>('.sacred-ambient-watermark, .watermark-committee, .sacred-finial-bridge, .bridge-emblem');
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
   * Staggered word reveal for titles and monumental headers
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
   * Trigger a refresh on ScrollTrigger
   */
  refreshScrollTrigger(): void {
    if (this.isBrowser) {
      ScrollTrigger.refresh();
    }
  }

  /**
   * Full GSAP-aware navigation reset.
   * Call this on NavigationEnd BEFORE the new page component renders.
   *
   * Sequence:
   *  1. Kill all window scroll tweens (GSAP scrollTo plugin)
   *  2. Kill all live ScrollTriggers (old page's instances)
   *  3. Immediately jump to top (both the DOM scroll containers)
   *  4. After two rAFs (new route DOM is now painted) → refresh ScrollTrigger
   *     so new page's entrance animations have correct trigger positions.
   */
  resetForNavigation(): void {
    if (!this.isBrowser) return;

    // 1. Kill any in-flight GSAP scroll tweens
    gsap.killTweensOf(window);

    // 2. Kill all ScrollTriggers created by the outgoing page
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    ScrollTrigger.clearScrollMemory();

    // 3. Jump to top immediately (before new component renders)
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // 4. After Angular renders new route DOM, settle scroll and refresh ST
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      // Second rAF: layout is complete, now refresh ScrollTrigger
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
        ScrollTrigger.refresh(true); // true = recalculate all positions from scratch
      });
    });
  }
}
