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
      const starElement = flareEl.querySelector('.cursor-single-golden-star') as HTMLElement | null;

      // Quick smooth tracking using GSAP with high responsiveness
      const xFlare = gsap.quickTo(flareEl, 'x', { duration: 0.04, ease: 'none' });
      const yFlare = gsap.quickTo(flareEl, 'y', { duration: 0.04, ease: 'none' });
      const xGhost = ghostOrb ? gsap.quickTo(ghostOrb, 'x', { duration: 0.25, ease: 'power2.out' }) : null;
      const yGhost = ghostOrb ? gsap.quickTo(ghostOrb, 'y', { duration: 0.25, ease: 'power2.out' }) : null;
      
      // Dynamic star reaction to movement velocity
      const scaleStar = starElement ? gsap.quickTo(starElement, 'scale', { duration: 0.2, ease: 'power1.out' }) : null;

      let lastX = 0;
      let lastY = 0;
      let lastTime = performance.now();

      const updateCoordinates = (clientX: number, clientY: number, isTouch = false) => {
        if (!this.isVisible()) {
          this.isVisible.set(true);
        }
        xFlare(clientX);
        yFlare(clientY);

        // Motion physics: calculate velocity
        const now = performance.now();
        const dt = Math.max(now - lastTime, 8);
        const vx = (clientX - lastX) / dt;
        const vy = (clientY - lastY) / dt;
        const speed = Math.min(Math.sqrt(vx * vx + vy * vy), 15);
        lastX = clientX;
        lastY = clientY;
        lastTime = now;

        // Subtle elastic star scaling on swift movement for lively responsiveness
        if (scaleStar) {
          const dynamicScale = this.isHovered() ? 1.25 : 1 + speed * 0.015;
          scaleStar(dynamicScale);
        }

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
      // When touching, the glow illuminates at touch point and fades out after a short duration upon release
      let touchFadeTimeout: any = null;

      const clearTouchFade = () => {
        if (touchFadeTimeout) {
          clearTimeout(touchFadeTimeout);
          touchFadeTimeout = null;
        }
      };

      const triggerTouchFade = (delayMs = 1200) => {
        clearTouchFade();
        touchFadeTimeout = setTimeout(() => {
          this.isVisible.set(false);
          this.isHovered.set(false);
          this.isTextHovered.set(false);
          if (this.lastIlluminatedEl) {
            this.lastIlluminatedEl.classList.remove('text-illuminated');
            this.lastIlluminatedEl = null;
          }
        }, delayMs);
      };

      const onTouchStart = (e: TouchEvent) => {
        clearTouchFade();
        if (e.touches.length > 0) {
          const t = e.touches[0];
          updateCoordinates(t.clientX, t.clientY, true);
        }
      };

      const onTouchMove = (e: TouchEvent) => {
        clearTouchFade();
        if (e.touches.length > 0) {
          const t = e.touches[0];
          updateCoordinates(t.clientX, t.clientY, true);
        }
      };

      const onTouchEnd = () => {
        // Fade out pointer after short pause once user lifts finger
        triggerTouchFade(1000);
      };

      const onTouchCancel = () => {
        triggerTouchFade(300);
      };

      // On route navigation or page change, reset glow state cleanly
      const navSub = this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe(() => {
        clearTouchFade();
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
      window.addEventListener('touchend', onTouchEnd, { passive: true });
      window.addEventListener('touchcancel', onTouchCancel, { passive: true });

      this.destroyRef.onDestroy(() => {
        clearTouchFade();
        navSub.unsubscribe();
        window.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('mouseleave', onMouseLeave);
        window.removeEventListener('touchstart', onTouchStart);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
        window.removeEventListener('touchcancel', onTouchCancel);
      });
    });
  }
}
