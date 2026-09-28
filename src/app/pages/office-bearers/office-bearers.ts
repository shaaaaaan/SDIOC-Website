import { Component, signal, afterNextRender, DestroyRef, ElementRef, viewChild, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { data } from '../../data/office-bearers.json';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export interface OfficeBearersData {
  year: string;
  people: Person[];
}

export interface Person {
  name: string;
  position: string;
  image: string;
}

@Component({
  standalone: true,
  selector: 'app-office-bearers',
  templateUrl: './office-bearers.html',
  styleUrl: './office-bearers.css'
})
export class OfficeBearers {
  selectedYear = signal(new Date().getFullYear());
  officeBearers = signal<OfficeBearersData[]>(data);

  headerBlock = viewChild<ElementRef<HTMLElement>>('headerBlock');
  committeeGrid = viewChild<ElementRef<HTMLElement>>('committeeGrid');

  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      // Register ScrollTrigger plugin
      gsap.registerPlugin(ScrollTrigger);

      const ctx = gsap.context(() => {
        // Animate Header
        const headerEl = this.headerBlock()?.nativeElement;
        if (headerEl) {
          gsap.fromTo(headerEl,
            { y: 30, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.9,
              ease: 'power3.out',
              clearProps: 'transform,opacity'
            }
          );
        }

        // Animate Member Cards with smooth stagger
        const gridEl = this.committeeGrid()?.nativeElement;
        if (gridEl) {
          const cards = gridEl.querySelectorAll('.member-card');
          if (cards.length > 0) {
            gsap.fromTo(cards,
              { y: 35, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                duration: 0.8,
                stagger: 0.06,
                ease: 'power2.out',
                clearProps: 'transform,opacity',
                scrollTrigger: {
                  trigger: gridEl,
                  start: 'top 88%',
                  once: true
                }
              }
            );

            // Animate member names with a distinct GSAP golden breathing glow & stroke aura
            const names = gridEl.querySelectorAll('.member-name');
            if (names.length > 0) {
              gsap.to(names, {
                color: '#ffeaa5',
                textShadow: '0 0 16px rgba(245, 200, 75, 0.85), 0 0 32px rgba(229, 184, 66, 0.5), 0 2px 8px rgba(0, 0, 0, 0.95)',
                duration: 2.2,
                repeat: -1,
                yoyo: true,
                ease: 'power1.inOut',
                stagger: 0.2
              });
            }

            // Animate role badges with a gentle golden pulse
            const badges = gridEl.querySelectorAll('.member-role-badge');
            if (badges.length > 0) {
              gsap.to(badges, {
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5), 0 0 22px rgba(229, 184, 66, 0.65)',
                borderColor: 'rgba(245, 210, 110, 0.95)',
                duration: 2.2,
                repeat: -1,
                yoyo: true,
                ease: 'power1.inOut',
                stagger: 0.2
              });
            }
          }
        }
      });

      this.destroyRef.onDestroy(() => {
        ctx.revert();
      });
    });
  }
}

