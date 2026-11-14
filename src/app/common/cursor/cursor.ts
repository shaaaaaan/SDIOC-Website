import { Component, ElementRef, viewChild, signal, inject, DestroyRef, afterNextRender, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { filter } from 'rxjs/operators';
import { gsap } from 'gsap';
import { NetworkActivityService } from '../../services/network-activity.service';

@Component({
  standalone: true,
  selector: 'app-cursor',
  templateUrl: './cursor.html'
})
export class Cursor {
  sunFlare = viewChild.required<ElementRef<HTMLDivElement>>('sunFlare');

  isVisible = signal(false);
  isHovered = signal(false);
  /** Over content that should stay unobstructed (e.g. portraits): star only, dimmed, no glow. */
  isSoft = signal(false);
  isTextHovered = signal(false);
  isIdle = signal(false);
  isTouchDevice = signal(false);
  isNavigating = signal(false);

  private networkActivity = inject(NetworkActivityService);
  readonly isLoading = signal(false);

  // Track the absolute URL to fix SVG fragment references (url(#id)) breaking on route changes
  currentUrl = signal<string>('');

  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  constructor() {
    // Initialize current URL for SVG gradients
    if (isPlatformBrowser(this.platformId)) {
      this.currentUrl.set(window.location.href.split('#')[0]);
    }

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      if (isPlatformBrowser(this.platformId)) {
        this.currentUrl.set(window.location.href.split('#')[0]);
      }
    });

    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      // Check if primary pointer is coarse/touchscreen or device lacks fine hover
      const isTouchMedia = window.matchMedia('(hover: none) and (pointer: coarse)').matches ||
                           ('ontouchstart' in window && navigator.maxTouchPoints > 0 && window.innerWidth < 1024);

      if (isTouchMedia) {
        this.isTouchDevice.set(true);
        // Avoid running custom cursor on pure touch devices completely
        return;
      }

      const flareEl = this.sunFlare().nativeElement;
      const ghostOrb = flareEl.querySelector('.sun-trailing-beam, .flare-ghost-orb') as HTMLElement | null;
      const starEl = flareEl.querySelector('.cursor-single-golden-star') as HTMLElement | null;
      const raysEl = flareEl.querySelector('.sun-rays-rotor') as HTMLElement | null;

      // Quick smooth tracking using GSAP with high responsiveness
      const xFlare = gsap.quickTo(flareEl, 'x', { duration: 0.04, ease: 'none' });
      const yFlare = gsap.quickTo(flareEl, 'y', { duration: 0.04, ease: 'none' });
      const xGhost = ghostOrb ? gsap.quickTo(ghostOrb, 'x', { duration: 0.25, ease: 'power2.out' }) : null;
      const yGhost = ghostOrb ? gsap.quickTo(ghostOrb, 'y', { duration: 0.25, ease: 'power2.out' }) : null;

      let currentCursorX = window.innerWidth / 2;
      let starAngle = 0;
      let raysAngle = 0;
      let lastTimestamp = performance.now();
      let animFrameId: number | null = null;

      // Continuous RAF loop to smoothly rotate the star and rays based on X position & loading
      const animateStarRotation = (now: number) => {
        const delta = Math.min((now - lastTimestamp) / 1000, 0.1);
        lastTimestamp = now;

        const screenWidth = window.innerWidth || 1920;
        const normalizedCenterDist = Math.abs(currentCursorX - screenWidth / 2) / (screenWidth / 2);
        const centerProximity = Math.max(0, Math.min(1, 1 - normalizedCenterDist)); // 1.0 at center, 0.0 at edge

        // Base speed in deg/s: 10 deg/s at edge, ramping up to 55 deg/s in middle
        let starSpeedDegPerSec = 10 + Math.pow(centerProximity, 1.4) * 45;
        let raysSpeedDegPerSec = 6 + Math.pow(centerProximity, 1.4) * 20;

        // If network is loading, spin significantly faster (ramp up ~400 deg/s)
        if (this.isNetworkActive()) {
          starSpeedDegPerSec = 360 + starSpeedDegPerSec * 1.5;
          raysSpeedDegPerSec = 180 + raysSpeedDegPerSec * 1.5;
        }

        starAngle = (starAngle + starSpeedDegPerSec * delta) % 360;
        raysAngle = (raysAngle + raysSpeedDegPerSec * delta) % 360;

        if (starEl) {
          starEl.style.transform = `translate(-50%, -50%) rotate(${starAngle.toFixed(2)}deg)`;
        }
        if (raysEl) {
          raysEl.style.transform = `rotate(${raysAngle.toFixed(2)}deg)`;
        }

        animFrameId = requestAnimationFrame(animateStarRotation);
      };

      // Only spin while the cursor is actually on screen and the tab is visible.
      const startSpin = () => {
        if (animFrameId === null && !document.hidden) {
          lastTimestamp = performance.now();
          animFrameId = requestAnimationFrame(animateStarRotation);
        }
      };
      const stopSpin = () => {
        if (animFrameId !== null) {
          cancelAnimationFrame(animFrameId);
          animFrameId = null;
        }
      };
      const onVisibilityChange = () => (document.hidden ? stopSpin() : this.isVisible() && startSpin());

      // Hover state is resolved when the element under the pointer changes (pointerover),
      // not on every pointermove. The old elementFromPoint() call per move forced a
      // hit-test + style lookup on every mouse event.
      const IFRAME_AREA = 'iframe, .iframe-container, .prayer-iframe, .google-form-container, .fullview-map-container, .fullview-map-iframe';
      const CLICKABLE = 'a, button, [role="button"], .portal-tile, .committee-card, .hierarchy-card, .ministry-card, .btn-hero-primary, .btn-hero-secondary, .metric-pill, .switch-tab-btn, .cross-emblem, .nav-item-link, .brand-link, .plinth-direct-link, .btn-map-direct, .btn-popout';
      const SOFT = '[data-cursor="soft"]';
      let overIframeArea = false;

      const onPointerOver = (e: PointerEvent) => {
        const elem = e.target as Element | null;
        if (!elem || typeof elem.closest !== 'function') return;
        overIframeArea = !!elem.closest(IFRAME_AREA);
        this.isHovered.set(!overIframeArea && !!elem.closest(CLICKABLE));
        this.isSoft.set(!overIframeArea && !!elem.closest(SOFT));
        if (overIframeArea) {
          // Hide custom pointer instantly inside any embedded viewer/iframe
          this.isVisible.set(false);
          stopSpin();
        }
      };

      const updateCoordinates = (clientX: number, clientY: number) => {
        currentCursorX = clientX;
        if (overIframeArea) return;

        if (!this.isVisible()) {
          this.isVisible.set(true);
        }
        startSpin();
        xFlare(clientX);
        yFlare(clientY);

        // Secondary optical ghost orb reflects relative to screen center
        if (xGhost && yGhost) {
          const offsetX = (window.innerWidth / 2 - clientX) * 0.12;
          const offsetY = (window.innerHeight / 2 - clientY) * 0.12;
          xGhost(offsetX);
          yGhost(offsetY);
        }
      };

      // Desktop Idle timeout tracking: fades to half brightness after 2.2s.
      // One timer that re-arms itself based on the last move time, instead of
      // clearTimeout/setTimeout on every pointer event.
      const IDLE_MS = 2200;
      let idleTimeout: ReturnType<typeof setTimeout> | null = null;
      let lastMoveAt = 0;

      const checkIdle = () => {
        const remaining = IDLE_MS - (performance.now() - lastMoveAt);
        if (remaining > 0) {
          idleTimeout = setTimeout(checkIdle, remaining);
        } else {
          idleTimeout = null;
          this.isIdle.set(true);
        }
      };

      const resetIdleTimer = () => {
        lastMoveAt = performance.now();
        if (this.isIdle()) {
          this.isIdle.set(false);
        }
        if (idleTimeout === null) {
          idleTimeout = setTimeout(checkIdle, IDLE_MS);
        }
      };

      // Pointer / Mouse events (Desktop / Non-touch devices only)
      const onPointerMove = (e: PointerEvent) => {
        if (e.pointerType === 'mouse' || e.pointerType === 'pen' || !e.pointerType) {
          updateCoordinates(e.clientX, e.clientY);
          resetIdleTimer();
        }
      };

      const onMouseLeave = () => {
        if (idleTimeout) {
          clearTimeout(idleTimeout);
          idleTimeout = null;
        }
        this.isVisible.set(false);
        this.isIdle.set(false);
        this.isHovered.set(false);
        this.isSoft.set(false);
        stopSpin();
      };

      // On route navigation or page change, update navigation state and reset idle cleanly
      const navSub = this.router.events.subscribe((event) => {
        if (event instanceof NavigationStart) {
          this.isNavigating.set(true);
        } else if (
          event instanceof NavigationEnd ||
          event instanceof NavigationCancel ||
          event instanceof NavigationError
        ) {
          this.isNavigating.set(false);
          if (idleTimeout) {
            clearTimeout(idleTimeout);
            idleTimeout = null;
          }
          this.isVisible.set(false);
          this.isIdle.set(false);
          this.isHovered.set(false);
          this.isSoft.set(false);
          stopSpin();
        }
      });

      window.addEventListener('pointermove', onPointerMove, { passive: true });
      document.addEventListener('pointerover', onPointerOver, { passive: true });
      document.addEventListener('mouseleave', onMouseLeave);
      document.addEventListener('visibilitychange', onVisibilityChange);

      this.destroyRef.onDestroy(() => {
        stopSpin();
        document.removeEventListener('pointerover', onPointerOver);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        if (idleTimeout) {
          clearTimeout(idleTimeout);
          idleTimeout = null;
        }
        navSub.unsubscribe();
        window.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('mouseleave', onMouseLeave);
      });
    });
  }

  isNetworkActive(): boolean {
    return this.networkActivity.isLoading() || this.isNavigating();
  }
}
