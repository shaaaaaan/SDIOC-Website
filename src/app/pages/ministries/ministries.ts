import { Component, signal, afterNextRender, DestroyRef, ElementRef, viewChild, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import ministriesData from '../../data/ministries.json';
import { MotionService, MOTION } from '../../services/motion.service';
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
      // Close: bring the ministry directory back and land on it.
      this.expandedMinistryId.set(null);
      if (this.marqueeTween) this.marqueeTween.kill();

      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
        const listEl = this.constellation()?.nativeElement;
        if (!listEl) return;
        this.scrollToEl(listEl);
        if (!this.motion.prefersReducedMotion) {
          gsap.fromTo(listEl,
            { autoAlpha: 0, y: 24 },
            { autoAlpha: 1, y: 0, duration: MOTION.dur.base, ease: MOTION.ease.out, clearProps: 'transform,opacity,visibility' }
          );
        }
      });
    } else {
      // Open: the directory is hidden while a ministry is shown.
      this.expandedMinistryId.set(id);
      this.showFullDesc.set(false);
      // Wait one frame for Angular to render the expanded section
      requestAnimationFrame(() => {
        this.animateExpandedCard();
        ScrollTrigger.refresh();
      });
    }
  }

  /** Scroll so the element sits just below the fixed nav bar. */
  private scrollToEl(el: Element) {
    const navOffset = window.innerWidth <= 768 ? 96 : 120;
    const targetY = window.scrollY + el.getBoundingClientRect().top - navOffset;
    window.scrollTo({ top: Math.max(0, targetY), behavior: this.motion.prefersReducedMotion ? 'auto' : 'smooth' });
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

    // Bring the opened ministry up under the nav bar
    this.scrollToEl(stage);
    
    const card = stage.querySelector('.ministry-card-v2');
    const titleWords = stage.querySelectorAll('.gs-title .gs-word');
    const descWords = stage.querySelectorAll('.gs-desc .gs-word');
    const leaders = stage.querySelectorAll('.leader-card');
    const badge = stage.querySelector('.ministry-audience-badge');
    const btn = stage.querySelector('.btn-ministry-inquire-subtle');
    const marqueeTrack = stage.querySelector('.gs-marquee') as HTMLElement;
    
    if (!card) return;

    // Card and its contents play as one overlapping sequence (~0.9s total instead of ~2.5s).
    const tl = gsap.timeline({ defaults: { ease: MOTION.ease.out } });

    tl.fromTo(card,
      { autoAlpha: 0, y: 36, scale: 0.985 },
      { autoAlpha: 1, y: 0, scale: 1, duration: MOTION.dur.base, clearProps: 'transform' }
    );

    const headerEls = [badge, btn].filter(Boolean);
    if (headerEls.length) {
      tl.fromTo(headerEls,
        { autoAlpha: 0, y: -8 },
        { autoAlpha: 1, y: 0, duration: MOTION.dur.fast, stagger: 0.06 },
        '<0.15'
      );
    }

    if (titleWords.length) {
      tl.fromTo(titleWords,
        { autoAlpha: 0, yPercent: 50 },
        { autoAlpha: 1, yPercent: 0, duration: 0.5, stagger: this.motion.cappedStagger(titleWords.length, 0.04, 0.25) },
        '<0.05'
      );
    }

    if (descWords.length) {
      // Long descriptions used to trickle in word-by-word for several seconds.
      tl.fromTo(descWords,
        { autoAlpha: 0, y: 10 },
        { autoAlpha: 0.85, y: 0, duration: 0.45, stagger: this.motion.cappedStagger(descWords.length, 0.01, 0.35) },
        '<0.1'
      );
    }

    if (leaders.length) {
      tl.fromTo(leaders,
        { autoAlpha: 0, y: 28, scale: 0.95 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: MOTION.ease.pop, stagger: this.motion.cappedStagger(leaders.length, 0.05, 0.3), clearProps: 'transform' },
        '<0.15'
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

      let detachMotion: () => void = () => {};

      const ctx = gsap.context(() => {
        if (this.motion.prefersReducedMotion) return;

        const tl = gsap.timeline({ defaults: { ease: MOTION.ease.out } });

        const headerEl = this.headerBlock()?.nativeElement;
        if (headerEl) {
          tl.from(headerEl, { y: 24, autoAlpha: 0, duration: MOTION.dur.base, clearProps: 'transform,opacity,visibility' });
        }

        const constellationEl = this.constellation()?.nativeElement;
        const nodes = constellationEl ? gsap.utils.toArray<HTMLElement>(constellationEl.querySelectorAll('.ministry-index-hint, .ministry-entry')) : [];
        if (nodes.length) {
          // Index entries rise in top-to-bottom, overlapping the header.
          tl.from(nodes, {
            autoAlpha: 0, y: 28,
            duration: 0.6,
            ease: MOTION.ease.out,
            stagger: { amount: MOTION.maxSpread, from: 'start' },
            clearProps: 'transform,opacity,visibility'
          }, headerEl ? '<0.1' : 0);
        }
      });

      const host = document.querySelector('app-ministries') as HTMLElement | null;
      if (host) ctx.add(() => { detachMotion = this.motion.initPageAnimations(host); });

      this.destroyRef.onDestroy(() => {
        detachMotion();
        this.marqueeTween?.kill();
        ctx.revert();
      });
    });
  }
}


