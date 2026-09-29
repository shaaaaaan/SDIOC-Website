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

      animFrameId = requestAnimationFrame(animateStarRotation);

      const updateCoordinates = (clientX: number, clientY: number) => {
        currentCursorX = clientX;
        // Detect if hovering over iframes (Google Forms, PDF Reader, Google Maps, embedded widgets)
        const elem = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
        if (elem) {
          const isIframeArea = elem.closest(
            'iframe, .iframe-container, .prayer-iframe, .google-form-container, .parchment-pdf-iframe, .reader-viewport-container, .fullview-map-container, .fullview-map-iframe'
          );

          if (isIframeArea) {
            // Hide custom pointer instantly inside any embedded viewer/iframe
            this.isVisible.set(false);
            return;
          }

          // Check for clickable items or cards with existing glow effects
          const glowingClickable = elem.closest(
            'a, button, [role="button"], .portal-tile, .committee-card, .hierarchy-card, .ministry-card, .btn-hero-primary, .btn-hero-secondary, .metric-pill, .switch-tab-btn, .cross-emblem, .nav-item-link, .brand-link, .plinth-direct-link, .btn-map-direct, .btn-popout'
          );
          this.isHovered.set(!!glowingClickable);
        }

        if (!this.isVisible()) {
          this.isVisible.set(true);
        }
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

      // Desktop Idle timeout tracking: fades to half brightness after 2.2s
      let idleTimeout: any = null;

      const resetIdleTimer = () => {
        if (this.isIdle()) {
          this.isIdle.set(false);
        }

        if (idleTimeout) {
          clearTimeout(idleTimeout);
          idleTimeout = null;
        }

        idleTimeout = setTimeout(() => {
          this.isIdle.set(true);
        }, 2200);
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
        }
      });

      window.addEventListener('pointermove', onPointerMove, { passive: true });
      document.addEventListener('mouseleave', onMouseLeave);

      this.destroyRef.onDestroy(() => {
        if (animFrameId) {
          cancelAnimationFrame(animFrameId);
        }
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
