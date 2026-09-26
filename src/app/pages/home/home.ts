import { Component, inject, afterNextRender, DestroyRef, ElementRef, viewChild, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ConfigService } from '../../services/config.service';
import { MotionService } from '../../services/motion.service';
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
  portalsGrid = viewChild<ElementRef<HTMLDivElement>>('portalsGrid');
  hierarchyGrid = viewChild<ElementRef<HTMLDivElement>>('hierarchyGrid');
  bentoContainer = viewChild<ElementRef<HTMLDivElement>>('bentoContainer');

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      const ctx = gsap.context(() => {
        // Entrance animation for hero content and HUD
        const hudEl = this.hudCard()?.nativeElement;
        if (hudEl) {
          gsap.from(hudEl, {
            y: 50,
            opacity: 0,
            duration: 1.2,
            ease: 'power3.out',
            delay: 0.2
          });
        }

        // Staggered reveal for portal tiles
        const portalsEl = this.portalsGrid()?.nativeElement;
        if (portalsEl) {
          const tiles = portalsEl.querySelectorAll('.portal-tile');
          gsap.from(tiles, {
            y: 35,
            opacity: 0,
            duration: 0.8,
            stagger: 0.1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: portalsEl,
              start: 'top 85%'
            }
          });
        }

        // Staggered reveal for hierarchy cards
        const hierarchyEl = this.hierarchyGrid()?.nativeElement;
        if (hierarchyEl) {
          const cards = hierarchyEl.querySelectorAll('.hierarchy-card');
          gsap.from(cards, {
            y: 45,
            opacity: 0,
            duration: 1,
            stagger: 0.15,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: hierarchyEl,
              start: 'top 80%'
            }
          });
        }

        // Bento grid cards entrance
        const bentoEl = this.bentoContainer()?.nativeElement;
        if (bentoEl) {
          const cards = bentoEl.querySelectorAll('.bento-card');
          gsap.from(cards, {
            y: 40,
            opacity: 0,
            duration: 0.9,
            stagger: 0.15,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: bentoEl,
              start: 'top 85%'
            }
          });
        }
      });

      this.destroyRef.onDestroy(() => {
        ctx.revert();
      });
    });
  }
}
