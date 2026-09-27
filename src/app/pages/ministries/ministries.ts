import { Component, signal, afterNextRender, DestroyRef, ElementRef, viewChild, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import ministriesData from '../../data/ministries.json';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export interface Ministry {
  title: string;
  image: string;
  audience: string;
  description: string;
}

@Component({
  standalone: true,
  selector: 'app-ministries',
  imports: [RouterLink],
  templateUrl: './ministries.html',
  styleUrl: './ministries.css'
})
export class Ministries {
  ministries = signal<Ministry[]>(ministriesData.ministries);

  headerBlock = viewChild<ElementRef<HTMLElement>>('headerBlock');
  ministriesGrid = viewChild<ElementRef<HTMLElement>>('ministriesGrid');

  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      // Register ScrollTrigger plugin
      gsap.registerPlugin(ScrollTrigger);

      const ctx = gsap.context(() => {
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

        const gridEl = this.ministriesGrid()?.nativeElement;
        if (gridEl) {
          const cards = gridEl.querySelectorAll('.ministry-card');
          if (cards.length > 0) {
            gsap.fromTo(cards,
              { y: 35, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                duration: 0.8,
                stagger: 0.08,
                ease: 'power2.out',
                clearProps: 'transform,opacity',
                scrollTrigger: {
                  trigger: gridEl,
                  start: 'top 88%',
                  once: true
                }
              }
            );
          }
        }
      });

      this.destroyRef.onDestroy(() => {
        ctx.revert();
      });
    });
  }
}

