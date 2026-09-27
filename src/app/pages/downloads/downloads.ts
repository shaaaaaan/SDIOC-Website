import { Component, signal, computed, afterNextRender, DestroyRef, ElementRef, viewChild, PLATFORM_ID, inject, HostListener } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { data } from '../../data/resources.json';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export interface ResourceCategory {
  categoryName: string;
  items: ResourceItem[];
}

export interface ResourceItem {
  name: string;
  url: string;
}

export interface ActiveManuscript {
  item: ResourceItem;
  category: string;
}

@Component({
  standalone: true,
  selector: 'app-downloads',
  imports: [],
  templateUrl: './downloads.html',
  styleUrl: './downloads.css'
})
export class Downloads {
  resourceCategories = signal<ResourceCategory[]>(data);
  selectedCategory = signal<string>('ALL');
  searchQuery = signal<string>('');

  // Ancient Parchment Reader State
  selectedManuscript = signal<ActiveManuscript | null>(null);
  isParchmentMode = signal<boolean>(true);
  isReaderLoading = signal<boolean>(false);

  headerBlock = viewChild<ElementRef<HTMLElement>>('headerBlock');
  contentBlock = viewChild<ElementRef<HTMLDivElement>>('contentBlock');
  readerModal = viewChild<ElementRef<HTMLDivElement>>('readerModal');

  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);
  private sanitizer = inject(DomSanitizer);

  totalItemsCount = computed(() => {
    return this.resourceCategories().reduce((total, cat) => total + cat.items.length, 0);
  });

  safePdfUrl = computed<SafeResourceUrl | null>(() => {
    const manuscript = this.selectedManuscript();
    if (!manuscript) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(manuscript.item.url);
  });

  filteredCategories = computed(() => {
    const category = this.selectedCategory();
    const query = this.searchQuery().trim().toLowerCase();

    return this.resourceCategories()
      .map(cat => {
        if (category !== 'ALL' && cat.categoryName !== category) {
          return null;
        }

        if (!query) {
          return cat;
        }

        const matchingItems = cat.items.filter(item =>
          item.name.toLowerCase().includes(query) || cat.categoryName.toLowerCase().includes(query)
        );

        if (matchingItems.length === 0) return null;

        return {
          ...cat,
          items: matchingItems
        };
      })
      .filter((cat): cat is ResourceCategory => cat !== null);
  });

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      gsap.registerPlugin(ScrollTrigger);

      const ctx = gsap.context(() => {
        const headerEl = this.headerBlock()?.nativeElement;
        if (headerEl) {
          gsap.from(headerEl, {
            y: 35,
            opacity: 0,
            duration: 0.9,
            ease: 'power3.out'
          });
        }

        const contentEl = this.contentBlock()?.nativeElement;
        if (contentEl) {
          const shelves = contentEl.querySelectorAll('.ancient-library-shelf');
          gsap.from(shelves, {
            y: 35,
            opacity: 0,
            duration: 0.8,
            stagger: 0.15,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: contentEl,
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

  selectCategory(categoryName: string): void {
    this.selectedCategory.set(categoryName);
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  openBook(item: ResourceItem, categoryName: string): void {
    this.isReaderLoading.set(true);
    this.selectedManuscript.set({ item, category: categoryName });

    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'hidden';
      // Simulate manuscript illumination loading
      setTimeout(() => {
        this.isReaderLoading.set(false);
      }, 700);
    }
  }

  closeReader(): void {
    this.selectedManuscript.set(null);
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
    }
  }

  toggleParchmentMode(): void {
    this.isParchmentMode.update(val => !val);
  }

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    if (this.selectedManuscript()) {
      this.closeReader();
    }
  }

  getLeatherClass(index: number): string {
    const leatherTypes = [
      'leather-burgundy',
      'leather-antique-brown',
      'leather-navy',
      'leather-emerald',
      'leather-ochre',
      'leather-oxblood'
    ];
    return leatherTypes[index % leatherTypes.length];
  }

  getBookWidth(name: string): string {
    const len = name.length;
    if (len < 25) return '300px';
    if (len < 40) return '370px';
    if (len < 55) return '430px';
    return '490px';
  }

  getBookHeight(index: number): string {
    const heights = ['268px', '252px', '280px', '260px', '274px', '256px'];
    return heights[index % heights.length];
  }

  getBookLang(name: string): string {
    const lower = name.toLowerCase();
    if (lower.includes('manglish')) return 'Manglish';
    if (lower.includes('malayalam') || /[\u0D00-\u0D7F]/.test(name)) return 'Malayalam';
    if (lower.includes('english')) return 'English';
    return 'Liturgical';
  }
}

