import { Component, ElementRef, viewChild, signal, inject, DestroyRef, afterNextRender, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';

@Component({
  standalone: true,
  selector: 'app-cursor',
  templateUrl: './cursor.html'
})
export class Cursor {
  dot = viewChild.required<ElementRef<HTMLDivElement>>('dot');
  aura = viewChild.required<ElementRef<HTMLDivElement>>('aura');

  isVisible = signal(false);
  isHovered = signal(false);

  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      if (window.matchMedia('(pointer: coarse)').matches) return;

      const dotEl = this.dot().nativeElement;
      const auraEl = this.aura().nativeElement;

      gsap.set([dotEl, auraEl], { xPercent: -50, yPercent: -50 });

      const xDot = gsap.quickTo(dotEl, 'x', { duration: 0.12, ease: 'power3' });
      const yDot = gsap.quickTo(dotEl, 'y', { duration: 0.12, ease: 'power3' });
      const xAura = gsap.quickTo(auraEl, 'x', { duration: 0.38, ease: 'power3' });
      const yAura = gsap.quickTo(auraEl, 'y', { duration: 0.38, ease: 'power3' });

      const onPointerMove = (e: MouseEvent) => {
        if (!this.isVisible()) {
          this.isVisible.set(true);
        }
        xDot(e.clientX);
        yDot(e.clientY);
        xAura(e.clientX);
        yAura(e.clientY);

        // Detect hover state on interactive elements
        const target = e.target as HTMLElement | null;
        if (target) {
          const interactive = target.closest('a, button, [role="button"], input, select, textarea, .card, .qtile, .ncard, .lead-card, .ecard');
          this.isHovered.set(!!interactive);
        }
      };

      const onMouseLeave = () => {
        this.isVisible.set(false);
      };

      window.addEventListener('pointermove', onPointerMove, { passive: true });
      document.addEventListener('mouseleave', onMouseLeave);

      this.destroyRef.onDestroy(() => {
        window.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('mouseleave', onMouseLeave);
      });
    });
  }
}
