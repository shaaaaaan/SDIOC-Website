import { Component, signal, afterNextRender, DestroyRef, ElementRef, viewChild, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { data } from '../../../data/church-history.json';
import { gsap } from 'gsap';

export interface ChurchHistoryData {
  churchInfo: ChurchInfo;
  milestones: Milestone[];
}

export interface Milestone {
  year: string;
  date: string;
  title: string;
  description: string;
}

export interface ChurchInfo {
  name: string;
  affiliation: string;
  headquarters: string;
  founded_by: string;
}

@Component({
  standalone: true,
  selector: 'app-church-history',
  imports: [],
  templateUrl: './church-history.html',
  styleUrl: './church-history.css'
})
export class ChurchHistory {
  churchHistory = signal<ChurchHistoryData>(data);

  headerCard = viewChild<ElementRef<HTMLElement>>('headerCard');
  timelineContainer = viewChild<ElementRef<HTMLDivElement>>('timelineContainer');

  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      const ctx = gsap.context(() => {
        // Animate Header Profile Card
        const headerEl = this.headerCard()?.nativeElement;
        if (headerEl) {
          gsap.from(headerEl, {
            y: 35,
            opacity: 0,
            duration: 1,
            ease: 'power3.out'
          });
        }

        // Animate Timeline items as they enter the viewport
        const timelineEl = this.timelineContainer()?.nativeElement;
        if (timelineEl) {
          const items = timelineEl.querySelectorAll('.milestone-item');
          items.forEach((item) => {
            const isLeft = item.classList.contains('left');
            const card = item.querySelector('.milestone-card');
            const node = item.querySelector('.timeline-node');

            if (node) {
              gsap.from(node, {
                scale: 0,
                opacity: 0,
                duration: 0.5,
                ease: 'back.out(2)',
                scrollTrigger: {
                  trigger: item,
                  start: 'top 85%'
                }
              });
            }

            if (card) {
              gsap.from(card, {
                x: isLeft ? -40 : 40,
                opacity: 0,
                duration: 0.8,
                ease: 'power3.out',
                scrollTrigger: {
                  trigger: item,
                  start: 'top 85%'
                }
              });
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
