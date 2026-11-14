import { Injectable, PLATFORM_ID, inject, ElementRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

/**
 * Shared motion tokens. Every entrance on the site pulls from these so the whole app
 * moves with one rhythm: quick starts (expo/power4 "out" curves front-load the motion,
 * so content reads as arrived within ~150ms even though the tail settles longer).
 */
export const MOTION = {
  dur: { fast: 0.35, base: 0.6, slow: 0.85 },
  ease: {
    out: 'expo.out',        // primary entrance curve: fast arrival, long soft settle
    soft: 'power3.out',     // secondary elements
    pop: 'back.out(1.4)',   // small badges / nodes
  },
  /** Gap between elements within one choreographed sequence. */
  stagger: 0.05,
  /** Cap on how long any staggered group may take to *start* its last item. */
  maxSpread: 0.4,
  /** Where scroll reveals fire. Slightly below the fold edge so items are in motion as they appear. */
  start: 'top 90%',
} as const;

@Injectable({
  providedIn: 'root'
})
export class MotionService {
  private platformId = inject(PLATFORM_ID);
  readonly isBrowser = isPlatformBrowser(this.platformId);

  private gyroListenerAttached = false;
  private gyroBeta = 0;   // Tilt Front-to-Back [-180, 180]
  private gyroGamma = 0;  // Tilt Left-to-Right [-90, 90]
  private gyroFrame: number | null = null;
  /** Per-route cache of parallax targets so we don't querySelectorAll on every sensor event. */
  private gyroTargets: Record<string, HTMLElement[]> | null = null;
  private gyroTargetsAt = 0;

  private getGyroTargets(): Record<string, HTMLElement[]> {
    // Re-query at most once a second so late-rendered content is still picked up.
    const now = performance.now();
    if (this.gyroTargets && now - this.gyroTargetsAt < 1000) return this.gyroTargets;
    this.gyroTargetsAt = now;
    const q = (sel: string) => Array.from(document.querySelectorAll<HTMLElement>(sel));
    const navbar = document.querySelector<HTMLElement>('.sdioc-navbar, nav, .nav-bar');
    this.gyroTargets = {
      glow: q('.plaque-portrait-aura, .glass-specular-reflection, .heavenly-aura-bloom, .plaque-ambient-glow, .hierarchy-card-glow, .portal-glow'),
      orbs: q('.aura-orb'),
      cards: q('.portal-tile, .liturgy-hud-card, .ministry-card, .glass-card, .glass-panel, .bento-card, .horizontal-spine-codex'),
      plaques: q('.wood-body'),
      hierarchy: q('.hierarchy-card, .member-card, .committee-card'),
      navbar: navbar ? [navbar] : [],
      bg: q('.ambient-video-canvas-container, .sacred-background-canvas'),
      watermarks: q('.sacred-ambient-watermark, .watermark-committee, .watermark-portals, .watermark-hierarchy, .bridge-emblem'),
    };
    return this.gyroTargets;
  }

  constructor() {
    if (this.isBrowser) {
      gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
      // Site-wide defaults so stray tweens don't fall back to GSAP's sluggish 0.5s power1.
      gsap.defaults({ duration: MOTION.dur.base, ease: MOTION.ease.out });
      // Mobile URL-bar show/hide resizes the viewport constantly; recomputing every
      // trigger on each of those causes visible hitches mid-scroll.
      ScrollTrigger.config({ ignoreMobileResize: true });
      this.initGyroscope();
    }
  }



  /**
   * Initializes mobile gyroscope listener with automatic fallback to touch-drag inertial parallax
   * Drives exaggerated, rich parallax across every element on supported mobile / touch devices.
   */
  private initGyroscope(): void {
    if (!this.isBrowser || this.gyroListenerAttached) return;
    // Tilt parallax is a touch-device feature; skip it for mouse users and reduced-motion users.
    if (this.prefersReducedMotion || !window.matchMedia('(pointer: coarse)').matches) return;

    // 1. Gyroscope Orientation Listener (Active on mobile/tablet devices with sensor orientation)
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return;
      // Clamp values around resting smartphone angle (~45deg beta)
      const clampedBeta = Math.max(-40, Math.min(40, (e.beta - 45)));
      const clampedGamma = Math.max(-40, Math.min(40, e.gamma));

      // Deadband: ignore sensor noise below ~0.75deg so we don't re-tween for nothing.
      if (Math.abs(clampedBeta - this.gyroBeta) < 0.75 && Math.abs(clampedGamma - this.gyroGamma) < 0.75) return;

      this.gyroBeta = clampedBeta;
      this.gyroGamma = clampedGamma;

      // deviceorientation can fire faster than the display refreshes; coalesce to one update per frame.
      if (this.gyroFrame === null) {
        this.gyroFrame = requestAnimationFrame(() => {
          this.gyroFrame = null;
          this.updateGyroscopeParallax();
        });
      }
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
   * TIERED GYROSCOPE PARALLAX SYSTEM
   *
   * Tier 0 (NONE)   — Portrait headshots: zero movement. Parallax on a person's face
   *                    is disrespectful and visually jarring.
   * Tier 1 (GLOW)   — Luminous effects (auras, glows, specular blooms): steered freely
   *                    by gyro direction — these are the most natural to animate.
   * Tier 2 (CARDS)  — Cards/panels without portraits (portal tiles, ministry cards, HUD,
   *                    liturgy cards, hierarchy cards with saint icons): subtle 3D tilt.
   * Tier 3 (NAVBAR) — Navigation bar: very light horizontal sway only — UX sensible.
   * Tier 4 (BG)     — Background canvas, aura orbs, sacred geometry: gentle ambient drift.
   */
  private updateGyroscopeParallax(): void {
    // Normalised [-1, 1] tilt coordinates
    const normX = Math.max(-1, Math.min(1, this.gyroGamma / 35)); // left/right
    const normY = Math.max(-1, Math.min(1, this.gyroBeta / 35));  // front/back

    // Directional glow angle in degrees
    const glowAngle = (Math.atan2(normY, normX) * (180 / Math.PI) + 90 + 360) % 360;

    // Write global CSS vars so CSS animations can consume them too
    const root = document.documentElement;
    const t = this.getGyroTargets();
    root.style.setProperty('--gyro-angle',    `${glowAngle.toFixed(1)}deg`);
    root.style.setProperty('--gyro-x',        `${(normX * 100).toFixed(1)}%`);
    root.style.setProperty('--gyro-y',        `${(normY * 100).toFixed(1)}%`);
    root.style.setProperty('--gyro-offset-x', `${(normX * 18).toFixed(1)}px`);
    root.style.setProperty('--gyro-offset-y', `${(normY * 18).toFixed(1)}px`);

    // ── TIER 0: Portrait headshots — NO movement at all ───────────────────────
    // (handled by simply excluding .plaque-member-photo, .hierarchy-photo,
    //  .committee-member-photo from all tween targets)

    // ── TIER 1: Glows, Auras, Specular — steered freely by tilt direction ─────
    const glowEls = t['glow'];
    if (glowEls.length > 0) {
      gsap.to(glowEls, {
        x: -normX * 22,
        y: -normY * 18,
        duration: 0.55,
        ease: 'power1.out',
        overwrite: 'auto'
      });
    }

    // Aura orbs on the home background — larger, slower drift
    const auraOrbs = t['orbs'];
    if (auraOrbs.length > 0) {
      gsap.to(auraOrbs, {
        x: -normX * 35,
        y: -normY * 28,
        duration: 0.9,
        ease: 'power1.out',
        overwrite: 'auto'
      });
    }

    // ── TIER 2: Cards / Panels (no portraits) — subtle 3D tilt ───────────────
    // Use very small tilt angles to keep it sensible (max ~4deg)
    const cardTiltX = normY * 3.5;
    const cardTiltY = normX * 3.5;
    const cardShiftX = normX * 2.5;
    const cardShiftY = normY * 2;

    const cards = t['cards'];
    if (cards.length > 0) {
      gsap.to(cards, {
        rotateX: -cardTiltX,
        rotateY: cardTiltY,
        x: cardShiftX,
        y: cardShiftY,
        transformPerspective: 1200,
        duration: 0.5,
        ease: 'power1.out',
        overwrite: 'auto'
      });
    }

    // Oval plaque cards (office bearers): tilt the WOOD FRAME only, not the portrait
    // The wood-body tilts, but .plaque-member-photo inside is excluded
    const plaqueBodies = t['plaques'];
    if (plaqueBodies.length > 0) {
      gsap.to(plaqueBodies, {
        rotateX: -normY * 2.5,
        rotateY: normX * 2.5,
        transformPerspective: 1200,
        duration: 0.55,
        ease: 'power1.out',
        overwrite: 'auto'
      });
    }

    // Hierarchy cards on home page: tilt the card frame
    const hierarchyCards = t['hierarchy'];
    if (hierarchyCards.length > 0) {
      gsap.to(hierarchyCards, {
        rotateX: -normY * 2,
        rotateY: normX * 2,
        transformPerspective: 1400,
        duration: 0.55,
        ease: 'power1.out',
        overwrite: 'auto'
      });
    }

    // ── TIER 3: Navbar — very light horizontal sway only ─────────────────────
    const navbar = t['navbar'];
    if (navbar.length > 0) {
      gsap.to(navbar, {
        x: normX * 2.5,
        duration: 0.8,
        ease: 'power1.out',
        overwrite: 'auto'
      });
    }

    // ── TIER 4: Background / Sacred Geometry — gentle ambient drift ───────────
    const bgEls = t['bg'];
    if (bgEls.length > 0) {
      gsap.to(bgEls, {
        x: -normX * 6,
        y: -normY * 5,
        duration: 0.9,
        ease: 'power1.out',
        overwrite: 'auto'
      });
    }

    const watermarks = t['watermarks'];
    if (watermarks.length > 0) {
      gsap.to(watermarks, {
        x: normX * 5,
        y: normY * 5,
        duration: 0.7,
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
      y: 24,
      autoAlpha: 0,
      duration: MOTION.dur.base,
      ease: MOTION.ease.out,
      stagger: MOTION.stagger,
      clearProps: 'transform,opacity,visibility',
      ...vars
    });
  }

  /**
   * Stagger whose *total* spread is capped. A plain `stagger: 0.05` on 30 items makes
   * the last one wait 1.5s, which is what made long lists and titles feel laggy.
   */
  cappedStagger(count: number, each: number = MOTION.stagger, max: number = MOTION.maxSpread): number {
    if (count <= 1) return 0;
    return Math.min(each, max / (count - 1));
  }

  /**
   * Scroll reveal for repeated items (cards, tiles, rows). Uses ScrollTrigger.batch so
   * items that enter the viewport together animate as one staggered group, and items
   * further down animate when *they* arrive, never waiting on an index-based delay.
   */
  revealBatch(targets: gsap.DOMTarget, vars: gsap.TweenVars = {}, start: string = MOTION.start): void {
    if (!this.isBrowser) return;
    const els = gsap.utils.toArray<HTMLElement>(targets);
    if (!els.length) return;
    if (this.prefersReducedMotion) return;

    const from = { y: 28, autoAlpha: 0, ...vars };
    gsap.set(els, from);
    ScrollTrigger.batch(els, {
      start,
      once: true,
      interval: 0.08,
      batchMax: 8,
      onEnter: batch => gsap.to(batch, {
        y: 0, x: 0, scale: 1, autoAlpha: 1,
        duration: MOTION.dur.base,
        ease: MOTION.ease.out,
        stagger: this.cappedStagger(batch.length, 0.06),
        overwrite: true,
        clearProps: 'transform,opacity,visibility',
      }),
    });
  }

  /** True when the user asked the OS for less motion. */
  get prefersReducedMotion(): boolean {
    return this.isBrowser && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** True on devices with a precise hovering pointer (mouse / trackpad). */
  private get hasFinePointer(): boolean {
    return this.isBrowser && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }

  /**
   * Replaces an element's text with wrapped spans built via DOM APIs (no innerHTML,
   * so text is never parsed as markup). The original text is kept as an aria-label
   * and the spans are aria-hidden, so screen readers read the heading normally
   * instead of letter-by-letter.
   */
  private splitText(el: HTMLElement, mode: 'words' | 'chars'): HTMLElement[] {
    // Read text without innerText (which forces a synchronous layout). <br> counts as a
    // word break so "Worship.<br>Living" doesn't merge into one word.
    let raw = '';
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n.nodeType === Node.TEXT_NODE) raw += n.nodeValue;
      else if ((n as Element).tagName === 'BR') raw += ' ';
    }
    const text = raw.replace(/\s+/g, ' ').trim();
    if (!text) return [];

    const frag = document.createDocumentFragment();
    const targets: HTMLElement[] = [];
    const words = text.split(' ');

    words.forEach((word, wi) => {
      const wrap = document.createElement('span');
      wrap.setAttribute('aria-hidden', 'true');
      if (mode === 'words') {
        wrap.className = 'kinetic-word-wrap';
        const inner = document.createElement('span');
        inner.className = 'kinetic-word';
        inner.textContent = word;
        wrap.appendChild(inner);
        targets.push(inner);
      } else {
        wrap.className = 'golden-word-wrap';
        for (const c of Array.from(word)) {
          const ch = document.createElement('span');
          ch.className = 'golden-char';
          ch.textContent = c;
          wrap.appendChild(ch);
          targets.push(ch);
        }
      }
      frag.appendChild(wrap);
      if (mode === 'chars' && wi < words.length - 1) frag.appendChild(document.createTextNode(' '));
    });

    el.setAttribute('aria-label', text);
    el.replaceChildren(frag);
    return targets;
  }

  /**
   * Split and transition every word into view with a staggered entrance.
   * Hover effects are handled in CSS (.kinetic-word:hover), not per-word JS listeners.
   */
  splitAndAnimateWords(el: HTMLElement, options: { delay?: number; stagger?: number; trigger?: HTMLElement | string; once?: boolean } = {}): void {
    if (!this.isBrowser || !el || el.dataset['sdiocWordsSplit']) return;
    el.dataset['sdiocWordsSplit'] = 'true';
    if (this.prefersReducedMotion) return;

    const wordSpans = this.splitText(el, 'words');
    if (wordSpans.length === 0) return;

    gsap.fromTo(wordSpans,
      { yPercent: 60, autoAlpha: 0 },
      {
        yPercent: 0,
        autoAlpha: 1,
        duration: MOTION.dur.base,
        stagger: this.cappedStagger(wordSpans.length, options.stagger ?? 0.04, 0.3),
        ease: MOTION.ease.out,
        delay: options.delay ?? 0,
        force3D: true,
        scrollTrigger: {
          trigger: options.trigger || el,
          start: MOTION.start,
          once: options.once !== false
        },
        clearProps: 'all'
      }
    );
  }

  /**
   * Split and transition every character into view.
   *
   * Performance notes:
   *  - Only transform + opacity are animated (GPU-composited). Animating `filter`
   *    (blur / drop-shadow) per letter forces a full repaint of every glyph on
   *    every frame and was the main source of jank.
   *  - No per-letter JS listeners; the hover glow lives in CSS (.golden-char:hover).
   *  - All inline styles are cleared when finished so the spans stop being layers.
   */
  splitAndAnimateChars(el: HTMLElement, options: { delay?: number; stagger?: number; trigger?: HTMLElement | string; once?: boolean } = {}): void {
    if (!this.isBrowser || !el || el.dataset['sdiocCharsSplit']) return;
    el.dataset['sdiocCharsSplit'] = 'true';
    if (this.prefersReducedMotion) return;

    const charSpans = this.splitText(el, 'chars');
    if (charSpans.length === 0) return;

    // Total spread is capped, so a 40-letter title takes as long to land as a 15-letter one
    // (previously 0.018s * 40 = 0.72s of pure waiting before the last letter even started).
    gsap.fromTo(charSpans,
      { autoAlpha: 0, yPercent: 45, scale: 0.92 },
      {
        autoAlpha: 1,
        yPercent: 0,
        scale: 1,
        duration: 0.55,
        stagger: this.cappedStagger(charSpans.length, options.stagger ?? 0.016, 0.38),
        ease: MOTION.ease.out,
        delay: options.delay ?? 0,
        force3D: true,
        scrollTrigger: {
          trigger: options.trigger || el,
          start: MOTION.start,
          once: options.once !== false
        },
        clearProps: 'all'
      }
    );
  }

  /**
   * Interactive 3D card tilt reacting to pointer movement.
   * Uses gsap.quickTo (reuses one tween instead of creating one per mousemove)
   * and caches the card rect on enter instead of forcing layout on every move.
   */
  attach3DTilt(card: HTMLElement, maxTilt = 8): () => void {
    if (!this.isBrowser || !card || !this.hasFinePointer || this.prefersReducedMotion) return () => { };

    gsap.set(card, { transformPerspective: 1000 });
    const rotX = gsap.quickTo(card, 'rotateX', { duration: 0.3, ease: 'power1.out' });
    const rotY = gsap.quickTo(card, 'rotateY', { duration: 0.3, ease: 'power1.out' });
    let rect: DOMRect | null = null;

    const onEnter = () => { rect = card.getBoundingClientRect(); };
    const onMove = (e: PointerEvent) => {
      if (!rect) rect = card.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      rotX(((e.clientY - rect.top - cy) / cy) * -maxTilt);
      rotY(((e.clientX - rect.left - cx) / cx) * maxTilt);
    };
    const onLeave = () => {
      rect = null;
      rotX(0);
      rotY(0);
    };

    card.addEventListener('pointerenter', onEnter, { passive: true });
    card.addEventListener('pointermove', onMove, { passive: true });
    card.addEventListener('pointerleave', onLeave, { passive: true });

    return () => {
      card.removeEventListener('pointerenter', onEnter);
      card.removeEventListener('pointermove', onMove);
      card.removeEventListener('pointerleave', onLeave);
    };
  }

  /**
   * Magnetic button effect - buttons softly pull toward the cursor.
   * Same quickTo + cached-rect approach as attach3DTilt.
   */
  attachMagnetic(el: HTMLElement, pullStrength = 0.3): () => void {
    if (!this.isBrowser || !el || !this.hasFinePointer || this.prefersReducedMotion) return () => { };

    const toX = gsap.quickTo(el, 'x', { duration: 0.3, ease: 'power2.out' });
    const toY = gsap.quickTo(el, 'y', { duration: 0.3, ease: 'power2.out' });
    let rect: DOMRect | null = null;

    const onEnter = () => { rect = el.getBoundingClientRect(); };
    const onMove = (e: PointerEvent) => {
      if (!rect) rect = el.getBoundingClientRect();
      toX((e.clientX - (rect.left + rect.width / 2)) * pullStrength);
      toY((e.clientY - (rect.top + rect.height / 2)) * pullStrength);
    };
    const onLeave = () => {
      rect = null;
      gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)', overwrite: true });
    };

    el.addEventListener('pointerenter', onEnter, { passive: true });
    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave, { passive: true });

    return () => {
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
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
      this.splitAndAnimateChars(t);
    });

    // 2. Secondary headings (names, card titles...). These appear dozens of times
    //    per page, so animate per word rather than per letter to keep span count low.
    const subheadings = container.querySelectorAll<HTMLElement>('.section-heading, .portal-title, .hierarchy-name, .member-name, .committee-member-name, .ministry-card-title, .shelf-category-title, .bento-item-headline, .card-title, .prayer-verse-text');
    subheadings.forEach(sh => {
      this.splitAndAnimateWords(sh, {
        stagger: 0.04,
        delay: 0.05,
        trigger: sh
      });
    });

    // 3. Badges & tags. Each badge reveals when it reaches the viewport; previously they
    //    were all tied to the page container, so badges far down the page animated
    //    off-screen on load and section labels just "appeared" when scrolled to.
    const badges = container.querySelectorAll<HTMLElement>('.hero-editorial-badge, .hud-tag, .section-label, .committee-term-badge, .committee-header-badge, .ministries-badge, .downloads-badge, .prayer-badge, .church-header-badge');
    if (badges.length > 0 && !this.prefersReducedMotion) {
      this.revealBatch(badges, { y: 14, scale: 0.94 }, 'top 94%');
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

    // 6. Scroll parallax: background watermarks, sacred geometry, aura orbs
    //    (gentle scrub; portraits and portrait-containing cards are excluded)
    const watermarkEls = container.querySelectorAll<HTMLElement>(
      '.sacred-ambient-watermark, .watermark-committee, .watermark-portals, .watermark-hierarchy, .sacred-finial-bridge, .bridge-emblem'
    );
    watermarkEls.forEach(wm => {
      gsap.to(wm, {
        y: -18,
        ease: 'none',
        scrollTrigger: {
          trigger: wm,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.8
        }
      });
    });

    // Aura orbs: soft vertical drift on scroll (background ambiance only)
    const auraOrbs = container.querySelectorAll<HTMLElement>('.aura-orb, .plaque-portrait-aura, .hierarchy-card-glow');
    auraOrbs.forEach(orb => {
      gsap.to(orb, {
        y: -12,
        ease: 'none',
        scrollTrigger: {
          trigger: orb.closest('section') || orb,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1
        }
      });
    });

    // Group photos / non-portrait images: very mild vertical scroll parallax
    const groupPhotos = container.querySelectorAll<HTMLElement>(
      '.hierarchy-photo-frame, .bento-media-frame, .church-header-photo-frame, .group-photo-frame'
    );
    groupPhotos.forEach(frame => {
      gsap.to(frame, {
        y: -8,
        ease: 'none',
        scrollTrigger: {
          trigger: frame,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1
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
      duration: 0.7,
      scrollTo: { y: target, offsetY: offset, autoKill: true },
      ease: 'power3.inOut',
      overwrite: true
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
  resetForNavigation(scrollToContent = false): void {
    if (!this.isBrowser) return;

    if (this.contentScrollTimer) { clearTimeout(this.contentScrollTimer); this.contentScrollTimer = null; }

    // New route = new DOM; drop cached gyroscope parallax targets.
    this.gyroTargets = null;

    // 1. Kill any in-flight GSAP scroll tweens
    gsap.killTweensOf(window);

    // 2. Kill only ScrollTriggers whose trigger element left the DOM (the outgoing page).
    //    Killing *all* of them also killed triggers the incoming page / persistent footer
    //    had already created, leaving their content stuck at opacity 0 (e.g. the hero title).
    ScrollTrigger.getAll().forEach(trigger => {
      const el = trigger.trigger as Element | undefined;
      if (!el || !el.isConnected) trigger.kill();
    });
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
        if (scrollToContent) this.scrollToPageContent();
      });
    });
  }

  private contentScrollTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Sub-pages open with a tall video "window" above the content. After the page lands,
   * glide down so the page title sits just under the navbar, with content below it.
   * A short beat first lets the hero register; any user wheel/touch/key aborts the glide.
   */
  private scrollToPageContent(): void {
    if (this.contentScrollTimer) clearTimeout(this.contentScrollTimer);
    this.contentScrollTimer = setTimeout(() => {
      this.contentScrollTimer = null;
      const target = document.querySelector<HTMLElement>('.subpage-scroll-target');
      if (!target || window.scrollY > 4) return; // user already scrolled — leave them be

      // Navbar is a floating island; its bottom edge is what content must clear.
      const nav = document.querySelector<HTMLElement>('.sdioc-nav-island');
      const navH = nav ? nav.getBoundingClientRect().bottom : 0;
      const pad = parseFloat(getComputedStyle(target).paddingTop) || 0;
      // Land the first content block (title card) ~16px below the navbar.
      const y = Math.max(0, target.getBoundingClientRect().top + window.scrollY + pad - navH - 16);
      if (y < 8) return;

      if (this.prefersReducedMotion) {
        window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
        return;
      }

      const abort = () => gsap.killTweensOf(window);
      const opts = { passive: true, once: true } as AddEventListenerOptions;
      const evts = ['wheel', 'touchstart', 'keydown', 'mousedown'] as const;
      evts.forEach(e => window.addEventListener(e, abort, opts));
      const cleanup = () => evts.forEach(e => window.removeEventListener(e, abort));

      gsap.to(window, {
        duration: Math.min(1.4, 0.8 + y / 2000),
        scrollTo: { y, autoKill: true },
        ease: 'power2.inOut',
        overwrite: true,
        onComplete: cleanup,
        onInterrupt: cleanup,
      });
    }, 450);
  }
}
