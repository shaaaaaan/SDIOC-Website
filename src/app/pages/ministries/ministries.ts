import { Component, signal, afterNextRender, DestroyRef, ElementRef, viewChild, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import ministriesData from '../../data/ministries.json';
import { MotionService } from '../../services/motion.service';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export interface OfficeBearer {
  name: string;
  position: string;
  image: string;
}

export interface Ministry {
  id: string;
  title: string;
  logoIcon: string;
  audience: string;
  description: string;
  officeBearers: OfficeBearer[];
  activities: string[];
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
  
  // Accordion State
  expandedMinistryId = signal<string | null>(null);

  toggleMinistry(id: string) {
    if (this.expandedMinistryId() === id) {
      this.expandedMinistryId.set(null);
    } else {
      this.expandedMinistryId.set(id);
      // Small timeout to allow DOM to render before triggering ScrollTrigger refresh if needed
      setTimeout(() => ScrollTrigger.refresh(), 50);
    }
  }

  // Gallery State
  activeGallery = signal<string[] | null>(null);
  activePhotoIndex = signal<number>(0);

  openGallery(activities: string[], index: number) {
    this.activeGallery.set(activities);
    this.activePhotoIndex.set(index);
    document.body.style.overflow = 'hidden'; // prevent background scrolling
  }

  closeGallery() {
    this.activeGallery.set(null);
    document.body.style.overflow = '';
  }

  nextPhoto() {
    const gallery = this.activeGallery();
    if (!gallery) return;
    const nextIdx = (this.activePhotoIndex() + 1) % gallery.length;
    this.activePhotoIndex.set(nextIdx);
  }

  prevPhoto() {
    const gallery = this.activeGallery();
    if (!gallery) return;
    const prevIdx = (this.activePhotoIndex() - 1 + gallery.length) % gallery.length;
    this.activePhotoIndex.set(prevIdx);
  }

  headerBlock = viewChild<ElementRef<HTMLElement>>('headerBlock');
  ministriesGrid = viewChild<ElementRef<HTMLElement>>('ministriesGrid');

  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);
  private motion = inject(MotionService);

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
          const cards = gridEl.querySelectorAll('.ministry-accordion-item');
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

        // Bind page-wide kinetic transitions & 3D tilt
        const ministriesHost = document.querySelector('app-ministries') as HTMLElement;
        if (ministriesHost) {
          this.motion.initPageAnimations(ministriesHost);
        }
      });

      this.destroyRef.onDestroy(() => {
        ctx.revert();
      });
    });
  }
}


