import { Component, signal, computed, afterNextRender, DestroyRef, ElementRef, viewChild, PLATFORM_ID, inject, HostListener } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import vicenniumData from '../../../data/vicennium-timeline.json';
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

      const ctx = gsap.context(() => {
        // Animate Header Card
        const headerEl = this.headerBlock()?.nativeElement;
        if (headerEl) {
          gsap.from(headerEl, {
            y: 35,
            opacity: 0,
            duration: 0.9,
            ease: 'power3.out'
          });
        }

        // Animate Timeline items
        this.initTimelineAnimations();
      });

      this.destroyRef.onDestroy(() => {
        ctx.revert();
      });
    });
  }

  initTimelineAnimations(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const timelineEl = this.timelineContainer()?.nativeElement;
    if (!timelineEl) return;

    const items = timelineEl.querySelectorAll('.milestone-row');
    items.forEach((item) => {
      const isLeft = item.classList.contains('left-node');
      const card = item.querySelector('.milestone-glass-card');
      const node = item.querySelector('.timeline-golden-node');

      if (node) {
        gsap.fromTo(node,
          { scale: 0, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.7,
            ease: 'back.out(2.5)',
            scrollTrigger: {
              trigger: item,
              start: 'top 85%',
              once: true
            }
          }
        );
      }

      if (card) {
        gsap.fromTo(card,
          {
            x: isLeft ? -50 : 50,
            y: 20,
            opacity: 0,
            scale: 0.96
          },
          {
            x: 0,
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: item,
              start: 'top 85%',
              once: true
            },
            clearProps: 'transform,opacity'
          }
        );
      }
    });
  }

  setView(view: 'timeline' | 'gallery'): void {
    this.activeView.set(view);
    if (view === 'timeline') {
      setTimeout(() => {
        this.initTimelineAnimations();
      }, 50);
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
