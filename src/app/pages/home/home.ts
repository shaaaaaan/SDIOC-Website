import { Component, inject, afterNextRender, DestroyRef, ElementRef, viewChild, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ConfigService } from '../../services/config.service';
import { MotionService } from '../../services/motion.service';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

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

  heroBanner = viewChild<ElementRef<HTMLDivElement>>('heroBanner');
  hudCard = viewChild<ElementRef<HTMLDivElement>>('hudCard');
  portalsGrid = viewChild<ElementRef<HTMLDivElement>>('portalsGrid');
  hierarchyGrid = viewChild<ElementRef<HTMLDivElement>>('hierarchyGrid');
  bentoContainer = viewChild<ElementRef<HTMLDivElement>>('bentoContainer');

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      // Scroll listener to reveal hero banner when user starts scrolling
      const bannerEl = this.heroBanner()?.nativeElement;
      const onScrollCheck = () => {
        if (window.scrollY > 20) {
          if (bannerEl && !bannerEl.classList.contains('scrolled-revealed')) {
            bannerEl.classList.add('scrolled-revealed');
          }
        }
      };
      window.addEventListener('scroll', onScrollCheck, { passive: true });
      window.addEventListener('wheel', onScrollCheck, { passive: true });
      window.addEventListener('touchmove', onScrollCheck, { passive: true });

      this.destroyRef.onDestroy(() => {
        window.removeEventListener('scroll', onScrollCheck);
        window.removeEventListener('wheel', onScrollCheck);
        window.removeEventListener('touchmove', onScrollCheck);
      });

      // Ensure ScrollTrigger is registered
      gsap.registerPlugin(ScrollTrigger);

      const ctx = gsap.context(() => {
        // Entrance animation for hero content and HUD
        const hudEl = this.hudCard()?.nativeElement;
        if (hudEl) {
          gsap.fromTo(hudEl,
            { y: 40, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 1.1,
              ease: 'power3.out',
              delay: 0.15,
              clearProps: 'transform,opacity'
            }
          );
        }

        // Staggered reveal for portal tiles
        const portalsEl = this.portalsGrid()?.nativeElement;
        if (portalsEl) {
          const tiles = portalsEl.querySelectorAll('.portal-tile');
          gsap.fromTo(tiles,
            { y: 30, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.8,
              stagger: 0.1,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: portalsEl,
                start: 'top 90%',
                once: true
              },
              clearProps: 'transform,opacity'
            }
          );
        }

        // Staggered reveal for hierarchy cards
        const hierarchyEl = this.hierarchyGrid()?.nativeElement;
        if (hierarchyEl) {
          const cards = hierarchyEl.querySelectorAll('.hierarchy-card');
          gsap.fromTo(cards,
            { y: 35, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.9,
              stagger: 0.12,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: hierarchyEl,
                start: 'top 85%',
                once: true
              },
              clearProps: 'transform,opacity'
            }
          );

          // Subtle GSAP golden breathing glow for venerated holy names
          const names = hierarchyEl.querySelectorAll('.hierarchy-name');
          if (names.length > 0) {
            gsap.to(names, {
              color: '#ffeaa5',
              textShadow: '0 0 16px rgba(245, 200, 75, 0.85), 0 0 32px rgba(229, 184, 66, 0.5), 0 2px 10px rgba(0, 0, 0, 0.95)',
              duration: 2.8,
              repeat: -1,
              yoyo: true,
              ease: 'sine.inOut',
              stagger: 0.35
            });
          }
        }

        // Bento grid cards entrance
        const bentoEl = this.bentoContainer()?.nativeElement;
        if (bentoEl) {
          const cards = bentoEl.querySelectorAll('.bento-card');
          gsap.fromTo(cards,
            { y: 35, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.85,
              stagger: 0.12,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: bentoEl,
                start: 'top 85%',
                once: true
              },
              clearProps: 'transform,opacity'
            }
          );
        }

        // Subtle ambient floating motion for sacred geometry background emblems
        const sacredWatermarks = document.querySelectorAll('.sacred-ambient-watermark');
        if (sacredWatermarks.length > 0) {
          gsap.to(sacredWatermarks, {
            rotation: 360,
            duration: 120,
            ease: 'none',
            repeat: -1
          });
        }

        // Monumental Section Titles Word & Letter Split Reveals
        const sectionHeadings = document.querySelectorAll('.section-heading, .portal-title, .bento-title');
        sectionHeadings.forEach((heading) => {
          gsap.fromTo(heading,
            { y: 24, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.9,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: heading,
                start: 'top 90%',
                once: true
              }
            }
          );
        });
      });

      // Recalculate ScrollTrigger positions after render
      setTimeout(() => {
        ScrollTrigger.refresh();
      }, 100);

      this.destroyRef.onDestroy(() => {
        ctx.revert();
      });
    });
  }
}
