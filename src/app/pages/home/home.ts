import { Component, inject, afterNextRender, DestroyRef, ElementRef, viewChild, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ConfigService } from '../../services/config.service';
import { MotionService, MOTION } from '../../services/motion.service';
import { gsap } from 'gsap';

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {
  protected configService = inject(ConfigService);
  private motion = inject(MotionService);
  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);

  get googleForm() {
    return this.configService.configs();
  }

  hudCard = viewChild<ElementRef<HTMLDivElement>>('hudCard');
  hierarchyGrid = viewChild<ElementRef<HTMLDivElement>>('hierarchyGrid');
  bentoContainer = viewChild<ElementRef<HTMLDivElement>>('bentoContainer');

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      let detachMotion: () => void = () => {};

      const ctx = gsap.context(() => {
        if (this.motion.prefersReducedMotion) return;

        // Above-the-fold intro: the HUD card lands immediately (no start delay).
        const hudEl = this.hudCard()?.nativeElement;
        if (hudEl) {
          gsap.from(hudEl, {
            y: 28,
            autoAlpha: 0,
            duration: MOTION.dur.slow,
            ease: MOTION.ease.out,
            clearProps: 'transform,opacity,visibility'
          });
        }

        // Grids: each item reveals as it scrolls in, grouped with whatever else
        // entered at the same moment (no index-based waiting).

        const hierarchyEl = this.hierarchyGrid()?.nativeElement;
        if (hierarchyEl) this.motion.revealBatch(hierarchyEl.querySelectorAll('.hierarchy-card'), { y: 36, scale: 0.97 });

        const bentoEl = this.bentoContainer()?.nativeElement;
        if (bentoEl) this.motion.revealBatch(bentoEl.querySelectorAll('.bento-card'), { y: 32 });

        // The "breathing" glow on hierarchy names is now a CSS opacity animation on a
        // pseudo-element (see .hierarchy-name::after); tweening color + text-shadow
        // forever repainted every name on every frame.

        // Slow ambient rotation for the sacred geometry emblems (transform only).
        const sacredWatermarks = document.querySelectorAll('.sacred-ambient-watermark');
        if (sacredWatermarks.length > 0) {
          gsap.to(sacredWatermarks, { rotation: 360, duration: 120, ease: 'none', repeat: -1 });
        }
      });

      // Living typography, 3D card tilt and magnetic buttons.
      const homeHost = document.querySelector('app-home') as HTMLElement | null;
      if (homeHost) {
        ctx.add(() => { detachMotion = this.motion.initPageAnimations(homeHost); });
      }

      this.destroyRef.onDestroy(() => {
        detachMotion();
        ctx.revert();
      });
    });
  }
}
