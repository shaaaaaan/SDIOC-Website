import { Component, ElementRef, viewChild, signal, inject, DestroyRef, afterNextRender, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { gsap } from 'gsap';

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

  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  constructor() {
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

      // Quick smooth tracking using GSAP with high responsiveness
      const xFlare = gsap.quickTo(flareEl, 'x', { duration: 0.04, ease: 'none' });
      const yFlare = gsap.quickTo(flareEl, 'y', { duration: 0.04, ease: 'none' });
      const xGhost = ghostOrb ? gsap.quickTo(ghostOrb, 'x', { duration: 0.25, ease: 'power2.out' }) : null;
      const yGhost = ghostOrb ? gsap.quickTo(ghostOrb, 'y', { duration: 0.25, ease: 'power2.out' }) : null;

      const updateCoordinates = (clientX: number, clientY: number) => {
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

      // On route navigation or page change, reset state cleanly
      const navSub = this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe(() => {
        if (idleTimeout) {
          clearTimeout(idleTimeout);
          idleTimeout = null;
        }
        this.isVisible.set(false);
        this.isIdle.set(false);
        this.isHovered.set(false);
      });

      window.addEventListener('pointermove', onPointerMove, { passive: true });
      document.addEventListener('mouseleave', onMouseLeave);

      this.destroyRef.onDestroy(() => {
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
}
