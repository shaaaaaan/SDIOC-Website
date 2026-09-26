import { afterNextRender, Component, DestroyRef, ElementRef, inject, PLATFORM_ID, signal, viewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { gsap } from 'gsap';

@Component({
  standalone: true,
  selector: 'app-nav-bar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav-bar.html'
})
export class NavBar {
  churchTitle = viewChild.required<ElementRef<HTMLDivElement>>('churchTitle');
  churchSubTitle = viewChild.required<ElementRef<HTMLDivElement>>('churchSubTitle');
  clouds = viewChild<ElementRef<HTMLDivElement>>('clouds');
  imgSrc = signal(`images/common/image-from-rawpixel-id-6119797-png.png`);

  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      const cloudsEl = this.clouds()?.nativeElement;
      if (!cloudsEl) return;

      const ctx = gsap.context(() => {
        const cloudImgs = gsap.utils.toArray<HTMLElement>(cloudsEl.querySelectorAll('img'));
        cloudImgs.forEach((cloudImg, index) => {
          gsap.set(cloudImg, {
            y: 0,
            x: (index * 200) - 100,
            opacity: 0.35,
            scale: gsap.utils.random(1.1, 1.4)
          });

          gsap.to(cloudImg, {
            x: '+=60',
            duration: gsap.utils.random(8, 14),
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
            delay: index * 0.4
          });
        });

        // Subtle drifting cloud layer
        gsap.to(cloudsEl, {
          xPercent: -15,
          ease: 'none',
          duration: 35,
          repeat: -1,
          yoyo: true
        });
      }, cloudsEl);

      this.destroyRef.onDestroy(() => {
        ctx.revert();
      });
    });
  }
}
