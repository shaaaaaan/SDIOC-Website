import { Component, signal, afterNextRender, DestroyRef, ElementRef, viewChild, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { data } from '../../data/office-bearers.json';
import { gsap } from 'gsap';

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

      const ctx = gsap.context(() => {
        // Animate Header
        const headerEl = this.headerBlock()?.nativeElement;
        if (headerEl) {
          gsap.from(headerEl, {
            y: 30,
            opacity: 0,
            duration: 0.9,
            ease: 'power3.out'
          });
        }

        // Animate Member Cards with stagger
        const gridEl = this.committeeGrid()?.nativeElement;
        if (gridEl) {
          const cards = gridEl.querySelectorAll('.member-card');
          gsap.from(cards, {
            y: 40,
            opacity: 0,
            duration: 0.8,
            stagger: 0.08,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: gridEl,
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
