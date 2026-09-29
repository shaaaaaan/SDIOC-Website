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
      const flameGroup = flareEl.querySelector('.candle-flame-group') as SVGElement | null;
      const candleBody = flareEl.querySelector('.candle-body-group') as SVGElement | null;

      // Quick smooth tracking using GSAP with high responsiveness
      const xFlare = gsap.quickTo(flareEl, 'x', { duration: 0.04, ease: 'none' });
      const yFlare = gsap.quickTo(flareEl, 'y', { duration: 0.04, ease: 'none' });
      const xGhost = ghostOrb ? gsap.quickTo(ghostOrb, 'x', { duration: 0.25, ease: 'power2.out' }) : null;
      const yGhost = ghostOrb ? gsap.quickTo(ghostOrb, 'y', { duration: 0.25, ease: 'power2.out' }) : null;
      
      // Physics inertia for flame and candle body
      // Flame tilts opposing velocity; candle body and wick smoothly tilt based on screen X position + subtle motion inertia
      const rotateFlame = flameGroup ? gsap.quickTo(flameGroup, 'rotation', { duration: 0.2, ease: 'power1.out' }) : null;
      const skewFlame = flameGroup ? gsap.quickTo(flameGroup, 'skewX', { duration: 0.15, ease: 'power1.out' }) : null;
      const rotateBody = candleBody ? gsap.quickTo(candleBody, 'rotation', { duration: 0.18, ease: 'power2.out' }) : null;
      const rotateWick = flareEl.querySelector('.candle-wick-group') ? gsap.quickTo(flareEl.querySelector('.candle-wick-group'), 'rotation', { duration: 0.18, ease: 'power2.out' }) : null;

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
        lastX = clientX;
        lastY = clientY;
        lastTime = now;

        // Calculate normalized horizontal position across screen:
        // Screen center (X = 50%) -> 0deg (candle vertically straight up)
        // Right edge (X = 100%) -> -45deg tilt (top-left flame pointing to bottom-right candle base)
        // Left edge (X = 0%) -> +45deg tilt (top-right flame pointing to bottom-left candle base, mirrored)
        const halfWidth = window.innerWidth / 2 || 1;
        const normalizedX = Math.max(Math.min((clientX - halfWidth) / halfWidth, 1), -1);

        // Smoothly interpolate angle across screen: -45deg to +45deg (0deg at screen center)
        const maxTiltAngle = 45;
        const positionAngle = -normalizedX * maxTiltAngle;

        // Apply dynamic tilt to candle body and wick (+ motion swing)
        if (rotateBody) {
          const bodyTilt = positionAngle + Math.max(Math.min(-vx * 2.5, 8), -8);
          rotateBody(bodyTilt);
        }

        if (rotateWick) {
          const wickTilt = positionAngle * 0.45;
          rotateWick(wickTilt);
        }

        // Apply realistic flame buoyancy & aerodynamic inertia
        // Flame stays vertically buoyant (0deg baseline) and tilts opposite to motion velocity
        if (rotateFlame && skewFlame) {
          const flameAngle = Math.max(Math.min(-vx * 9, 26), -26);
          const flameSkew = Math.max(Math.min(-vx * 6, 18), -18);
          rotateFlame(flameAngle);
          skewFlame(flameSkew);
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
