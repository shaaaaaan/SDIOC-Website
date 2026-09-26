import { Component, signal, computed, afterNextRender, DestroyRef, ElementRef, viewChild, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { data } from '../../data/resources.json';
import { gsap } from 'gsap';

export interface ResourceCategory {
  categoryName: string;
  items: ResourceItem[];
}

export interface ResourceItem {
  name: string;
  url: string;
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

  headerBlock = viewChild<ElementRef<HTMLElement>>('headerBlock');
  contentBlock = viewChild<ElementRef<HTMLDivElement>>('contentBlock');

  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);

  totalItemsCount = computed(() => {
    return this.resourceCategories().reduce((total, cat) => total + cat.items.length, 0);
  });

  filteredCategories = computed(() => {
    const category = this.selectedCategory();
    const query = this.searchQuery().trim().toLowerCase();

    return this.resourceCategories()
      .map(cat => {
        // Check if category matches filter
        if (category !== 'ALL' && cat.categoryName !== category) {
          return null;
        }

        // Filter items by query
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
          const cards = contentEl.querySelectorAll('.resource-card');
          gsap.from(cards, {
            y: 30,
            opacity: 0,
            duration: 0.7,
            stagger: 0.05,
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
}
