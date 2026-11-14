import { Component, signal, computed, afterNextRender, DestroyRef, ElementRef, viewChild, PLATFORM_ID, inject, HostListener } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import vicenniumData from '../../../data/vicennium-timeline.json';
import { MotionService, MOTION } from '../../../services/motion.service';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export interface GalleryPhoto {
  id: string;
  url: string;
  caption: string;
  milestoneId: string;
  year: string;
  category: string;
}

export interface VicenniumMilestone {
  id: string;
  year: string;
  title: string;
  subtitle: string;
  category: string;
  description: string;
  tags: string[];
  images: GalleryPhoto[];
  featuredImage: string | null;
}

export interface VicenniumManifest {
  title: string;
  description: string;
  milestones: VicenniumMilestone[];
  gallery: GalleryPhoto[];
}

@Component({
  standalone: true,
  selector: 'app-church-history',
  imports: [],
  templateUrl: './church-history.html',
  styleUrl: './church-history.css'
})
export class ChurchHistory {
  archive = signal<VicenniumManifest>(vicenniumData as VicenniumManifest);
  activeView = signal<'timeline' | 'gallery'>('timeline');
  selectedGalleryTag = signal<string>('ALL');

  // Lightbox Modal State
  activePhoto = signal<GalleryPhoto | null>(null);
  activePhotoIndex = signal<number>(-1);

  headerBlock = viewChild<ElementRef<HTMLElement>>('headerBlock');
  timelineContainer = viewChild<ElementRef<HTMLDivElement>>('timelineContainer');
  galleryContainer = viewChild<ElementRef<HTMLDivElement>>('galleryContainer');

  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);
  private motion = inject(MotionService);

  galleryCategories = computed(() => {
    const categories = new Set<string>();
    this.archive().gallery.forEach(p => categories.add(p.category));
    return Array.from(categories);
  });

  filteredGallery = computed(() => {
    const selected = this.selectedGalleryTag();
    if (selected === 'ALL') {
      return this.archive().gallery;
    }
    return this.archive().gallery.filter(p => p.category === selected || p.year === selected);
  });

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      gsap.registerPlugin(ScrollTrigger);

      let detachMotion: () => void = () => {};

      this.ctx = gsap.context(() => {
        const headerEl = this.headerBlock()?.nativeElement;
        if (headerEl && !this.motion.prefersReducedMotion) this.motion.fadeUp(headerEl);

        this.initTimelineAnimations();
        this.initMarquees();

        const host = document.querySelector('app-church-history') as HTMLElement | null;
        if (host) detachMotion = this.motion.initPageAnimations(host);
      });

      this.destroyRef.onDestroy(() => {
        detachMotion();
        this.marquees.forEach(m => m.destroy());
        this.marquees = [];
        this.ctx?.revert();
      });
    });
  }

  private ctx?: gsap.Context;
  private marquees: { track: HTMLElement; destroy: () => void }[] = [];

  /** Photo marquee speed in px/s — constant regardless of how many photos a milestone has. */
  private readonly MARQUEE_SPEED = 38;

  /**
   * Seamless photo marquees. A GSAP loop on transform (compositor-only) replaces the CSS
   * keyframe so we can: keep speed constant, ease timeScale to 0 on hover/focus rather
   * than an abrupt stop, and pause entirely while off-screen.
   */
  initMarquees(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const root = this.timelineContainer()?.nativeElement;
    if (!root) return;

    // Drop loops whose DOM was torn down by a view switch.
    this.marquees = this.marquees.filter(m => {
      if (m.track.isConnected) return true;
      m.destroy();
      return false;
    });

    if (this.motion.prefersReducedMotion) return;

    root.querySelectorAll<HTMLElement>('.marquee-track').forEach(track => {
      if (track.dataset['sdiocMarquee']) return;
      track.dataset['sdiocMarquee'] = 'true';
      const viewport = track.parentElement as HTMLElement;

      // Track holds two identical sets, so one loop period is exactly half its width.
      const period = () => track.scrollWidth / 2;
      const loop = gsap.to(track, {
        x: () => -period(),
        duration: () => period() / this.MARQUEE_SPEED,
        ease: 'none',
        repeat: -1,
        force3D: true,
        paused: true,
      });

      let visible = false;
      let hovered = false;
      const setSpeed = (target: number, duration: number) => {
        if (target > 0 && loop.paused()) loop.play();
        gsap.to(loop, {
          timeScale: target,
          duration,
          ease: 'power2.out',
          overwrite: true,
          onComplete: () => { if (target === 0) loop.pause(); },
        });
      };
      const update = () => setSpeed(visible && !hovered ? 1 : 0, hovered ? 0.6 : 0.9);

      const io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (!visible) { gsap.killTweensOf(loop); loop.timeScale(0).pause(); return; }
        update();
      }, { rootMargin: '80px 0px' });
      io.observe(viewport);

      const enter = () => { hovered = true; update(); };
      const leave = () => { hovered = false; update(); };
      viewport.addEventListener('pointerenter', enter);
      viewport.addEventListener('pointerleave', leave);
      viewport.addEventListener('focusin', enter);
      viewport.addEventListener('focusout', leave);

      loop.timeScale(0);
      this.marquees.push({
        track,
        destroy: () => {
          io.disconnect();
          viewport.removeEventListener('pointerenter', enter);
          viewport.removeEventListener('pointerleave', leave);
          viewport.removeEventListener('focusin', enter);
          viewport.removeEventListener('focusout', leave);
          gsap.killTweensOf(loop);
          loop.kill();
          gsap.set(track, { clearProps: 'transform' });
        },
      });
    });
  }

  initTimelineAnimations(): void {
    if (!isPlatformBrowser(this.platformId) || this.motion.prefersReducedMotion) return;
    const timelineEl = this.timelineContainer()?.nativeElement;
    if (!timelineEl) return;

    const run = () => {
      timelineEl.querySelectorAll<HTMLElement>('.milestone-row').forEach(item => {
        // Rows rebuilt by a view switch get fresh elements; skip ones already wired.
        if (item.dataset['sdiocRevealed']) return;
        item.dataset['sdiocRevealed'] = 'true';

        const isLeft = item.classList.contains('left-node');
        const card = item.querySelector('.milestone-glass-card');
        const node = item.querySelector('.timeline-golden-node');

        // Node pops, card slides in from its side and overlaps it: one short sequence per row.
        const tl = gsap.timeline({
          defaults: { ease: MOTION.ease.out },
          scrollTrigger: { trigger: item, start: 'top 88%', once: true }
        });
        if (node) tl.fromTo(node, { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.45, ease: MOTION.ease.pop });
        if (card) {
          tl.fromTo(card,
            { x: isLeft ? -36 : 36, y: 14, autoAlpha: 0, scale: 0.97 },
            { x: 0, y: 0, autoAlpha: 1, scale: 1, duration: MOTION.dur.base, clearProps: 'transform,opacity,visibility' },
            node ? '<0.05' : 0
          );
        }
      });
    };

    // Register inside the page context so these triggers are reverted on destroy too.
    if (this.ctx) this.ctx.add(run); else run();
  }

  setView(view: 'timeline' | 'gallery'): void {
    this.activeView.set(view);
    if (view === 'timeline') {
      // Wait one frame for the timeline view to render, then wire its rows.
      requestAnimationFrame(() => {
        this.initTimelineAnimations();
        this.initMarquees();
        ScrollTrigger.refresh();
      });
    }
  }

  filterGallery(tag: string): void {
    this.selectedGalleryTag.set(tag);
  }

  openLightbox(photo: GalleryPhoto): void {
    const list = this.archive().gallery;
    const idx = list.findIndex(p => p.id === photo.id);
    this.activePhoto.set(photo);
    this.activePhotoIndex.set(idx >= 0 ? idx : 0);

    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'hidden';
    }
  }

  closeLightbox(): void {
    this.activePhoto.set(null);
    this.activePhotoIndex.set(-1);

    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
    }
  }

  prevPhoto(): void {
    const list = this.archive().gallery;
    const currentIdx = this.activePhotoIndex();
    if (currentIdx > 0) {
      const newIdx = currentIdx - 1;
      this.activePhotoIndex.set(newIdx);
      this.activePhoto.set(list[newIdx]);
    } else {
      const newIdx = list.length - 1;
      this.activePhotoIndex.set(newIdx);
      this.activePhoto.set(list[newIdx]);
    }
  }

  nextPhoto(): void {
    const list = this.archive().gallery;
    const currentIdx = this.activePhotoIndex();
    if (currentIdx < list.length - 1) {
      const newIdx = currentIdx + 1;
      this.activePhotoIndex.set(newIdx);
      this.activePhoto.set(list[newIdx]);
    } else {
      this.activePhotoIndex.set(0);
      this.activePhoto.set(list[0]);
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardNav(event: KeyboardEvent): void {
    if (!this.activePhoto()) return;

    if (event.key === 'Escape') {
      this.closeLightbox();
    } else if (event.key === 'ArrowLeft') {
      this.prevPhoto();
    } else if (event.key === 'ArrowRight') {
      this.nextPhoto();
    }
  }
}
