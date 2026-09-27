import { Component, ElementRef, viewChild, signal, inject, DestroyRef, afterNextRender, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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
  private destroyRef = inject(DestroyRef);
  private lastIlluminatedEl: HTMLElement | null = null;

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      const flareEl = this.sunFlare().nativeElement;
      const ghostOrb = flareEl.querySelector('.flare-ghost-orb') as HTMLElement | null;

      // Quick smooth tracking using GSAP
      const xFlare = gsap.quickTo(flareEl, 'x', { duration: 0.12, ease: 'power3' });
      const yFlare = gsap.quickTo(flareEl, 'y', { duration: 0.12, ease: 'power3' });
      const xGhost = ghostOrb ? gsap.quickTo(ghostOrb, 'x', { duration: 0.35, ease: 'power2.out' }) : null;
      const yGhost = ghostOrb ? gsap.quickTo(ghostOrb, 'y', { duration: 0.35, ease: 'power2.out' }) : null;

      const updateCoordinates = (clientX: number, clientY: number) => {
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

      // Pointer / Mouse events (Desktop)
      const onPointerMove = (e: MouseEvent) => {
        updateCoordinates(e.clientX, e.clientY);
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
      const onTouchStart = (e: TouchEvent) => {
        if (e.touches.length > 0) {
          const t = e.touches[0];
          updateCoordinates(t.clientX, t.clientY);
        }
      };

      const onTouchMove = (e: TouchEvent) => {
        if (e.touches.length > 0) {
          const t = e.touches[0];
          updateCoordinates(t.clientX, t.clientY);
        }
      };

      const onTouchEnd = () => {
        // Fade out gracefully after touch release
        setTimeout(() => {
          this.isVisible.set(false);
          this.isTextHovered.set(false);
          if (this.lastIlluminatedEl) {
            this.lastIlluminatedEl.classList.remove('text-illuminated');
            this.lastIlluminatedEl = null;
          }
        }, 300);
      };

      window.addEventListener('pointermove', onPointerMove, { passive: true });
      document.addEventListener('mouseleave', onMouseLeave);
      window.addEventListener('touchstart', onTouchStart, { passive: true });
      window.addEventListener('touchmove', onTouchMove, { passive: true });
      window.addEventListener('touchend', onTouchEnd, { passive: true });
      window.addEventListener('touchcancel', onTouchEnd, { passive: true });

      this.destroyRef.onDestroy(() => {
        window.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('mouseleave', onMouseLeave);
        window.removeEventListener('touchstart', onTouchStart);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
        window.removeEventListener('touchcancel', onTouchEnd);
      });
    });
  }
}
