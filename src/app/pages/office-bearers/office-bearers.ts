import { Component, signal, afterNextRender, DestroyRef, ElementRef, viewChild, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { data } from '../../data/office-bearers.json';
import { MotionService } from '../../services/motion.service';
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
  private motion = inject(MotionService);

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

        // Animate Oval Plaque Cards with smooth stagger
        const gridEl = this.committeeGrid()?.nativeElement;
        if (gridEl) {
          const cards = gridEl.querySelectorAll('.oval-plaque-card, .oval-wood-body');
          if (cards.length > 0) {
            gsap.fromTo(cards,
              { y: 40, opacity: 0, scale: 0.96 },
              {
                y: 0,
                opacity: 1,
                scale: 1,
                duration: 0.85,
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

            // Animate only titled/clerical names with breathing golden illumination
            const titledNames = gridEl.querySelectorAll('.plaque-member-name.titled-name');
            if (titledNames.length > 0) {
              gsap.to(titledNames, {
                color: '#ffeaa5',
                textShadow: '0 0 16px rgba(245, 200, 75, 0.85), 0 0 32px rgba(229, 184, 66, 0.5), 0 2px 8px rgba(0, 0, 0, 0.95)',
                duration: 2.2,
                repeat: -1,
                yoyo: true,
                ease: 'power1.inOut',
                stagger: 0.2
              });
            }

            // Interactive desktop mouse 3D parallax on internal portrait & glass reflection
            const plaqueCards = gridEl.querySelectorAll<HTMLElement>('.oval-plaque-card');
            plaqueCards.forEach(card => {
              const woodBody = card.querySelector<HTMLElement>('.oval-wood-body');
              const portrait = card.querySelector<HTMLElement>('.plaque-member-photo');
              const glassShine = card.querySelector<HTMLElement>('.glass-specular-reflection');
              const aura = card.querySelector<HTMLElement>('.plaque-portrait-aura');

              if (woodBody) {
                card.addEventListener('mousemove', (e: MouseEvent) => {
                  const rect = woodBody.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  const cx = rect.width / 2;
                  const cy = rect.height / 2;

                  const rotX = ((y - cy) / cy) * -8;
                  const rotY = ((x - cx) / cx) * 8;
                  const moveX = ((x - cx) / cx) * 10;
                  const moveY = ((y - cy) / cy) * 8;

                  // Tilt outer wood plaque
                  gsap.to(woodBody, {
                    rotateX: rotX,
                    rotateY: rotY,
                    transformPerspective: 1000,
                    duration: 0.35,
                    ease: 'power1.out'
                  });

                  // Parallax aura
                  if (aura) {
                    gsap.to(aura, {
                      x: -moveX * 0.6,
                      y: -moveY * 0.6,
                      duration: 0.45,
                      ease: 'power1.out'
                    });
                  }

                  // Slide glass reflection specular highlight
                  if (glassShine) {
                    gsap.to(glassShine, {
                      x: -moveX * 1.5,
                      y: -moveY * 1.2,
                      duration: 0.35,
                      ease: 'power1.out'
                    });
                  }
                });

                card.addEventListener('mouseleave', () => {
                  gsap.to(woodBody, {
                    rotateX: 0,
                    rotateY: 0,
                    duration: 0.6,
                    ease: 'power2.out',
                    clearProps: 'transform'
                  });

                  if (aura) {
                    gsap.to(aura, {
                      x: 0,
                      y: 0,
                      duration: 0.6,
                      ease: 'power2.out',
                      clearProps: 'transform'
                    });
                  }

                  if (glassShine) {
                    gsap.to(glassShine, {
                      x: 0,
                      y: 0,
                      duration: 0.6,
                      ease: 'power2.out',
                      clearProps: 'transform'
                    });
                  }
                });
              }
            });
          }
        }

        // Bind page-wide kinetic transitions
        const officeHost = document.querySelector('app-office-bearers') as HTMLElement;
        if (officeHost) {
          this.motion.initPageAnimations(officeHost);
        }
      });

      this.destroyRef.onDestroy(() => {
        ctx.revert();
      });
    });
  }
}
