import { afterNextRender, Component, DestroyRef, ElementRef, inject, PLATFORM_ID, signal, viewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs/operators';
import { gsap } from 'gsap';

@Component({
  standalone: true,
  selector: 'app-nav-bar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.css'
})
export class NavBar {
  isScrolled = signal(false);
  isMenuOpen = signal(false);
  isDropdownOpen = signal(false);

  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);

  closeDropdown(): void {
    this.isDropdownOpen.set(false);
    if (isPlatformBrowser(this.platformId)) {
      const activeEl = document.activeElement as HTMLElement;
      if (activeEl && typeof activeEl.blur === 'function') {
        activeEl.blur();
      }
    }
  }

  constructor() {
    // Automatically close menu when user navigates
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.closeMenu();
    });

    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      const handleScroll = () => {
        const scrolled = window.scrollY > 40;
        if (this.isScrolled() !== scrolled) {
          this.isScrolled.set(scrolled);
        }
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && this.isMenuOpen()) {
          this.closeMenu();
        }
      };

      window.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('keydown', handleKeyDown);

      this.destroyRef.onDestroy(() => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('keydown', handleKeyDown);
        if (isPlatformBrowser(this.platformId)) {
          document.body.style.overflow = '';
        }
      });
    });
  }

  toggleMenu(): void {
    if (this.isMenuOpen()) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  openMenu(): void {
    this.isMenuOpen.set(true);

    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'hidden';

      // Kinetic GSAP entrance for menu items
      gsap.fromTo('.curtain-nav-link',
        { y: 35, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.55, stagger: 0.06, ease: 'power4.out', delay: 0.15 }
      );

      gsap.fromTo('.curtain-info-panel',
        { x: 30, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.6, ease: 'power3.out', delay: 0.25 }
      );
    }
  }

  closeMenu(): void {
    if (!this.isMenuOpen()) return;

    this.isMenuOpen.set(false);
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
    }
  }
}
