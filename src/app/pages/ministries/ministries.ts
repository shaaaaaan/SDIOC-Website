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
  objectPosition?: string;
  transform?: string;
  filter?: string;
}

export interface Ministry {
  id: string;
  title: string;
  logoIcon: string;
  audience: string;
  description: string;
  officeBearers: OfficeBearer[];
  activities: string[];
  poster?: string;
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
  showFullDesc = signal<boolean>(false);

  toggleMinistry(id: string) {
    if (this.expandedMinistryId() === id) {
      this.expandedMinistryId.set(null);
      if (this.marqueeTween) this.marqueeTween.kill();
      
      // Smoothly recentre the ministry names cloud in the viewport
      setTimeout(() => {
        ScrollTrigger.refresh();
        const constellationEl = this.constellation()?.nativeElement;
        if (constellationEl) {
          const rect = constellationEl.getBoundingClientRect();
          const targetY = window.scrollY + rect.top + (rect.height / 2) - (window.innerHeight / 2);
          window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
        }
      }, 50);
    } else {
      this.expandedMinistryId.set(id);
      this.showFullDesc.set(false);
      // Wait for Angular to render the expanded section
      setTimeout(() => {
        ScrollTrigger.refresh();
        this.animateExpandedCard();
      }, 50);
    }
  }

  getWords(text: string): string[] {
    return text.split(' ');
  }

  // Marquee State
  marqueeTween: gsap.core.Tween | null = null;

  pauseMarquee() {
    if (this.marqueeTween) this.marqueeTween.pause();
  }

  resumeMarquee() {
    if (this.marqueeTween) this.marqueeTween.play();
  }

  animateExpandedCard() {
    const stage = document.querySelector('.ministry-expanded-stage');
    if (!stage) return;

    // Scroll the stage into view (top 25% of the screen)
    const stageRect = stage.getBoundingClientRect();
    const targetY = window.scrollY + stageRect.top - (window.innerHeight * 0.25);
    window.scrollTo({ top: targetY, behavior: 'smooth' });
    
    const card = stage.querySelector('.ministry-card-v2');
    const titleWords = stage.querySelectorAll('.gs-title .gs-word');
    const descWords = stage.querySelectorAll('.gs-desc .gs-word');
    const leaders = stage.querySelectorAll('.leader-card');
    const badge = stage.querySelector('.ministry-audience-badge');
    const btn = stage.querySelector('.btn-ministry-inquire-subtle');
    const marqueeTrack = stage.querySelector('.gs-marquee') as HTMLElement;
    
    if (!card) return;

    const tl = gsap.timeline();
    
    // 1. Card overall Entrance
    tl.fromTo(card, 
      { opacity: 0, y: 50, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'power3.out' }
    );
    
    // 2. Badge & Subtle Button
    if (badge || btn) {
      const headerEls = [badge, btn].filter(Boolean);
      tl.fromTo(headerEls, 
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' },
        "-=0.4"
      );
    }

    // 3. Title Words
    if (titleWords.length) {
      tl.fromTo(titleWords,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power2.out' },
        "-=0.4"
      );
    }

    // 4. Desc Words
    if (descWords.length) {
      tl.fromTo(descWords,
        { opacity: 0, y: 12 },
        { opacity: 0.85, y: 0, duration: 0.4, stagger: 0.012, ease: 'power2.out' },
        "-=0.3"
      );
    }

    // 5. Leaders Cards Grid
    if (leaders.length) {
      tl.fromTo(leaders,
        { opacity: 0, y: 35, scale: 0.94 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.06, ease: 'back.out(1.2)' },
        "-=0.2"
      );
    }

    // 7. Setup continuous GSAP Marquee
    if (marqueeTrack) {
      if (this.marqueeTween) this.marqueeTween.kill();
      
      const items = marqueeTrack.querySelectorAll('.gs-marquee-item');
      if (items.length) {
        // Track width contains duplicated items, we translate by -50% to create an infinite loop
        gsap.set(marqueeTrack, { x: 0 });
        this.marqueeTween = gsap.to(marqueeTrack, { 
          x: "-50%", 
          duration: 35, // Adjust speed
          ease: "none", 
          repeat: -1 
        });
      }
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
  constellation = viewChild<ElementRef<HTMLElement>>('constellation');

  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);
  private motion = inject(MotionService);

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      gsap.registerPlugin(ScrollTrigger);

      const ctx = gsap.context(() => {
        // Header entrance
        const headerEl = this.headerBlock()?.nativeElement;
        if (headerEl) {
          gsap.fromTo(headerEl,
            { y: 30, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', clearProps: 'all' }
          );
        }

        // Constellation Floating Animation
        const constellationEl = this.constellation()?.nativeElement;
        if (constellationEl) {
          const nodes = constellationEl.querySelectorAll('.constellation-node');
          
          if (nodes.length > 0) {
            // Entrance
            gsap.fromTo(nodes, 
              { scale: 0.5, opacity: 0, y: 30 }, 
              { 
                scale: 1, 
                opacity: 1, 
                y: 0, 
                duration: 1.2, 
                stagger: 0.1, 
                ease: 'back.out(1.5)',
                clearProps: 'transform,opacity',
                onComplete: () => {
                  // Continuous floating
                  nodes.forEach((node: any, index: number) => {
                    gsap.to(node, {
                      y: `random(-20, 20)`,
                      x: `random(-15, 15)`,
                      rotation: `random(-3, 3)`,
                      duration: `random(3, 5)`,
                      repeat: -1,
                      yoyo: true,
                      ease: 'sine.inOut',
                      delay: index * 0.1
                    });
                  });
                }
              }
            );
          }
        }

        // Bind page-wide kinetic transitions
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


