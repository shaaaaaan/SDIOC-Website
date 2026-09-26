// app.ts
import { Component, ElementRef, inject, OnInit, afterNextRender, Injector, viewChild, DestroyRef, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { NavBar } from './common/nav-bar/nav-bar';
import { Footer } from './common/footer/footer';
import { Cursor } from './common/cursor/cursor';
import { MotionService } from './services/motion.service';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [RouterOutlet, NavBar, Footer, Cursor],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private router = inject(Router);
  private injector = inject(Injector);
  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);
  private motion = inject(MotionService);

  mainOutlet = viewChild<ElementRef<HTMLElement>>('mainOutlet');
  bannerVideo = viewChild<ElementRef<HTMLVideoElement>>('bannerVideo');
  churchFallback = viewChild<ElementRef<HTMLImageElement>>('churchFallback');

  isHome = signal<boolean>(true);

  ngOnInit() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => {
      const isHomePage = event.urlAfterRedirects === '/' || event.urlAfterRedirects === '/home' || event.urlAfterRedirects === '';
      this.isHome.set(isHomePage);

      // Defer actions until browser paint pass
      afterNextRender(() => {
        if (!isPlatformBrowser(this.platformId)) return;

        // Safely close mobile navigation if open
        const navbarEl = document.getElementById('mainNavigation');
        if (navbarEl && navbarEl.classList.contains('show')) {
          navbarEl.classList.remove('show');
        }

        const outlet = this.mainOutlet()?.nativeElement;

        if (isHomePage) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (outlet) {
          outlet.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Ensure ambient video is playing safely
        const videoEl = this.bannerVideo()?.nativeElement;
        if (videoEl) {
          videoEl.muted = true;
          const playPromise = videoEl.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {
              // If video autoplay is prevented or fails, reveal fallback image
              const fallbackEl = this.churchFallback()?.nativeElement;
              if (fallbackEl) {
                fallbackEl.style.opacity = '1';
              }
            });
          }
        }

        this.motion.refreshScrollTrigger();
      }, { injector: this.injector });
    });
  }
}
