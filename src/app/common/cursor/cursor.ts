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

  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private lastIlluminatedEl: HTMLElement | null = null;

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      const flareEl = this.sunFlare().nativeElement;
      const ghostOrb = flareEl.querySelector('.sun-trailing-beam, .flare-ghost-orb') as HTMLElement | null;

      // Quick smooth tracking using GSAP with high responsiveness
      const xFlare = gsap.quickTo(flareEl, 'x', { duration: 0.04, ease: 'none' });
      const yFlare = gsap.quickTo(flareEl, 'y', { duration: 0.04, ease: 'none' });
      const xGhost = ghostOrb ? gsap.quickTo(ghostOrb, 'x', { duration: 0.25, ease: 'power2.out' }) : null;
      const yGhost = ghostOrb ? gsap.quickTo(ghostOrb, 'y', { duration: 0.25, ease: 'power2.out' }) : null;

      const updateCoordinates = (clientX: number, clientY: number, isTouch = false) => {
        if (!this.isVisible()) {
          this.isVisible.set(true);
        }
        xFlare(clientX);
        yFlare(clientY);

        // Secondary optical ghost orb reflects relative to screen center
        if (xGhost && yGhost) {
          const offsetX = (window.innerWidth / 2 - clientX) * 0.15;
          const offsetY = (window.innerHeight / 2 - clientY) * 0.15;
          xGhost(offsetX);
          yGhost(offsetY);
        }

        // Detect element under cursor / touch point
        const elem = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
        if (elem) {
          // Check for interactive button/link
          const interactive = elem.closest('a, button, [role="button"], input, select, textarea, .card, .portal-tile, .hierarchy-card, .bento-card');
          this.isHovered.set(!!interactive);

          // Check for text elements to illuminate
          const textElem = elem.closest('h1, h2, h3, h4, h5, h6, p, a, span, button, .hud-time, .hud-tag, .portal-title, .portal-desc, .hierarchy-name, .bento-item-headline, .brand-name') as HTMLElement | null;
          
          if (textElem) {
            this.isTextHovered.set(true);
            if (this.lastIlluminatedEl && this.lastIlluminatedEl !== textElem) {
              this.lastIlluminatedEl.classList.remove('text-illuminated');
            }
            textElem.classList.add('text-illuminated');
            this.lastIlluminatedEl = textElem;
          } else {
            this.isTextHovered.set(false);
            if (this.lastIlluminatedEl) {
              this.lastIlluminatedEl.classList.remove('text-illuminated');
              this.lastIlluminatedEl = null;
            }
          }
        }
      };

      // Pointer / Mouse events (Desktop / Non-touch)
      const onPointerMove = (e: PointerEvent) => {
        if (e.pointerType === 'mouse' || e.pointerType === 'pen' || !e.pointerType) {
          updateCoordinates(e.clientX, e.clientY, false);
        }
      };

      const onMouseLeave = () => {
        this.isVisible.set(false);
        this.isTextHovered.set(false);
        if (this.lastIlluminatedEl) {
          this.lastIlluminatedEl.classList.remove('text-illuminated');
          this.lastIlluminatedEl = null;
        }
      };

      // Touch events (Mobile & Tablet touchscreens)
      // When touching, the glow remains at the last touched position until navigation/reload
      const onTouchStart = (e: TouchEvent) => {
        if (e.touches.length > 0) {
          const t = e.touches[0];
          updateCoordinates(t.clientX, t.clientY, true);
        }
      };

      const onTouchMove = (e: TouchEvent) => {
        if (e.touches.length > 0) {
          const t = e.touches[0];
          updateCoordinates(t.clientX, t.clientY, true);
        }
      };

      // On route navigation or page change, reset glow state cleanly
      const navSub = this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe(() => {
        this.isVisible.set(false);
        this.isTextHovered.set(false);
        this.isHovered.set(false);
        if (this.lastIlluminatedEl) {
          this.lastIlluminatedEl.classList.remove('text-illuminated');
          this.lastIlluminatedEl = null;
        }
      });

      window.addEventListener('pointermove', onPointerMove, { passive: true });
      document.addEventListener('mouseleave', onMouseLeave);
      window.addEventListener('touchstart', onTouchStart, { passive: true });
      window.addEventListener('touchmove', onTouchMove, { passive: true });

      this.destroyRef.onDestroy(() => {
        navSub.unsubscribe();
        window.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('mouseleave', onMouseLeave);
        window.removeEventListener('touchstart', onTouchStart);
        window.removeEventListener('touchmove', onTouchMove);
      });
    });
  }
}
