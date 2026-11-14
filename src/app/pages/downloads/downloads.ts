import { Component, signal, computed, afterNextRender, DestroyRef, ElementRef, viewChild, PLATFORM_ID, inject, HostListener } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { data } from '../../data/resources.json';
import { MotionService } from '../../services/motion.service';
import { gsap } from 'gsap';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
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
  readerError = signal<boolean>(false);

  headerBlock = viewChild<ElementRef<HTMLElement>>('headerBlock');
  contentBlock = viewChild<ElementRef<HTMLDivElement>>('contentBlock');
  readerModal = viewChild<ElementRef<HTMLDivElement>>('readerModal');
  pdfPages = viewChild<ElementRef<HTMLDivElement>>('pdfPages');

  private pdfDoc: PDFDocumentProxy | null = null;
  private loadingTask: PDFDocumentLoadingTask | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private scrollRaf = 0;
  private renderTasks = new Map<number, RenderTask>();
  private renderedWidth = 0;
  private loadToken = 0;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly onViewportChange = () => {
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => this.relayoutPages(), 150);
  };
  private readonly onPagesScroll = () => {
    if (this.scrollRaf) return;
    this.scrollRaf = requestAnimationFrame(() => {
      this.scrollRaf = 0;
      this.renderVisiblePages();
    });
  };

  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);
  private motion = inject(MotionService);

  totalItemsCount = computed(() => {
    return this.resourceCategories().reduce((total, cat) => total + cat.items.length, 0);
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

      let detachMotion: () => void = () => {};

      const ctx = gsap.context(() => {
        if (!this.motion.prefersReducedMotion) {
          const headerEl = this.headerBlock()?.nativeElement;
          if (headerEl) this.motion.fadeUp(headerEl);

          const contentEl = this.contentBlock()?.nativeElement;
          if (contentEl) {
            // Placards and book spines each reveal as they reach the viewport.
            this.motion.revealBatch(contentEl.querySelectorAll('.shelf-placard'), { y: 20 });
            this.motion.revealBatch(contentEl.querySelectorAll('.horizontal-spine-codex'), { x: -24, y: 0 });
          }
        }

        const host = document.querySelector('app-downloads') as HTMLElement | null;
        if (host) detachMotion = this.motion.initPageAnimations(host);
      });

      this.destroyRef.onDestroy(() => {
        detachMotion();
        ctx.revert();
        this.closeReader();
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
    this.readerError.set(false);
    this.isReaderLoading.set(true);
    this.selectedManuscript.set({ item, category: categoryName });

    if (!isPlatformBrowser(this.platformId)) return;
    document.body.style.overflow = 'hidden';

    // Pages are drawn with pdf.js on every device: browsers' built-in PDF viewers
    // (Safari especially) ignore fit-to-width hints and mobile browsers can't embed PDFs at all.
    // Wait a tick for the @if block to render the pages container.
    setTimeout(() => this.loadPdf(item.url), 0);
  }

  closeReader(): void {
    this.selectedManuscript.set(null);
    this.teardownPdf();
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
    }
  }

  private async loadPdf(url: string): Promise<void> {
    const token = ++this.loadToken;
    try {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
      if (token !== this.loadToken) return;
      const loadingTask = pdfjs.getDocument({ url });
      this.loadingTask = loadingTask;
      const doc = await loadingTask.promise;
      if (token !== this.loadToken) return;
      this.pdfDoc = doc;
      await this.buildPagePlaceholders();
      this.isReaderLoading.set(false);
    } catch (err) {
      if (token !== this.loadToken) return;
      console.error('Failed to load PDF', err);
      this.readerError.set(true);
      this.isReaderLoading.set(false);
    }
  }

  /** Creates one sized slot per page; canvases are drawn lazily as slots scroll into view. */
  private async buildPagePlaceholders(): Promise<void> {
    const container = this.pdfPages()?.nativeElement;
    const doc = this.pdfDoc;
    if (!container || !doc) return;

    this.cancelRenders();
    container.replaceChildren();

    // Use page 1's aspect ratio for initial slot sizing; each slot is corrected when drawn.
    const first = await doc.getPage(1);
    const base = first.getViewport({ scale: 1 });
    for (let n = 1; n <= doc.numPages; n++) {
      const slot = document.createElement('div');
      slot.className = 'pdfjs-page';
      slot.dataset['page'] = String(n);
      slot.style.aspectRatio = `${base.width} / ${base.height}`;
      container.appendChild(slot);
    }

    // Measure after slots exist so any scrollbar is accounted for
    this.renderedWidth = container.clientWidth;
    container.addEventListener('scroll', this.onPagesScroll, { passive: true });

    // Container size changes on rotation, browser-chrome resize, or window resize
    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(this.onViewportChange);
    this.resizeObserver.observe(container);

    this.renderVisiblePages();
  }

  /** Draws pages within ~1.5 screens of the current scroll position. */
  private renderVisiblePages(): void {
    const container = this.pdfPages()?.nativeElement;
    if (!container || !this.pdfDoc) return;
    const margin = container.clientHeight * 1.5;
    const top = container.scrollTop - margin;
    const bottom = container.scrollTop + container.clientHeight + margin;
    const width = String(this.renderedWidth);

    for (const slot of Array.from(container.children) as HTMLElement[]) {
      const slotTop = slot.offsetTop;
      if (slotTop > bottom) break;
      if (slotTop + slot.offsetHeight < top) continue;
      if (slot.dataset['rendered'] === width) continue;
      this.renderPage(Number(slot.dataset['page']), slot);
    }
  }

  private async renderPage(pageNumber: number, slot: HTMLElement): Promise<void> {
    const doc = this.pdfDoc;
    if (!doc || this.renderTasks.has(pageNumber)) return;
    const width = this.renderedWidth;

    const page = await doc.getPage(pageNumber);
    const unscaled = page.getViewport({ scale: 1 });
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    let scale = (width / unscaled.width) * dpr;
    // Safari/iOS refuse canvases over ~16.7M pixels; large/4K screens can exceed that
    const maxPixels = 12_000_000;
    const pixels = unscaled.width * unscaled.height * scale * scale;
    if (pixels > maxPixels) scale *= Math.sqrt(maxPixels / pixels);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const task = page.render({ canvas, viewport });
    this.renderTasks.set(pageNumber, task);
    try {
      await task.promise;
      if (width !== this.renderedWidth) return; // a rotation happened mid-render
      slot.style.aspectRatio = `${unscaled.width} / ${unscaled.height}`;
      slot.replaceChildren(canvas);
      slot.dataset['rendered'] = String(width);
    } catch {
      // cancelled by relayout/close
    } finally {
      if (this.renderTasks.get(pageNumber) === task) this.renderTasks.delete(pageNumber);
    }
  }

  /** On rotation/resize, redraw at the new width and keep the reader on the same page. */
  private relayoutPages(): void {
    const container = this.pdfPages()?.nativeElement;
    if (!container || !this.pdfDoc) return;
    if (container.clientWidth === this.renderedWidth) return;

    const slots = Array.from(container.querySelectorAll<HTMLElement>('.pdfjs-page'));
    const top = container.scrollTop;
    const current = slots.find(s => s.offsetTop + s.offsetHeight > top) ?? slots[0];
    const offsetInPage = current ? (top - current.offsetTop) / current.offsetHeight : 0;

    this.cancelRenders();
    this.renderedWidth = container.clientWidth;
    if (current) {
      container.scrollTop = current.offsetTop + offsetInPage * current.offsetHeight;
    }
    this.renderVisiblePages();
  }

  private cancelRenders(): void {
    this.renderTasks.forEach(task => task.cancel());
    this.renderTasks.clear();
  }

  private teardownPdf(): void {
    this.loadToken++;
    this.cancelRenders();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.scrollRaf) cancelAnimationFrame(this.scrollRaf);
    this.scrollRaf = 0;
    this.pdfPages()?.nativeElement.removeEventListener('scroll', this.onPagesScroll);
    this.loadingTask?.destroy();
    this.loadingTask = null;
    this.pdfDoc = null;
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
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

  hasMalayalam(text: string): boolean {
    if (!text) return false;
    return text.toLowerCase().includes('malayalam') || /[\u0D00-\u0D7F]/.test(text);
  }
}

