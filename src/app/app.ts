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

  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private isVideoRevealed = false;
  private readonly IDLE_DELAY_MS = 7000; // 7 seconds of inactivity

  private handleViewportScrollAndTransition(isHomePage: boolean) {
    if (!isPlatformBrowser(this.platformId)) return;

    const outletEl = this.mainOutlet()?.nativeElement;

    if (isHomePage) {
      // Home route: always reset to absolute top (0, 0)
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      if (outletEl) {
        gsap.fromTo(outletEl,
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', clearProps: 'transform' }
        );
      }

      this.startIdleTimer();
      this.motion.refreshScrollTrigger();
    } else {
      // Subpages: Set scroll y position to 50% vh from the top
      const targetY = Math.round(window.innerHeight * 0.5);

      const applyScroll = () => {
        window.scrollTo(0, targetY);
        document.documentElement.scrollTop = targetY;
        document.body.scrollTop = targetY;
      };

      // Set scroll position immediately and sync with render frames
      applyScroll();
      requestAnimationFrame(() => {
        applyScroll();
        this.motion.refreshScrollTrigger();
      });
      setTimeout(() => {
        applyScroll();
        this.motion.refreshScrollTrigger();
      }, 50);
      setTimeout(() => {
        applyScroll();
        this.motion.refreshScrollTrigger();
      }, 150);

      // Smooth modern fade-in transition of new content
      if (outletEl) {
        gsap.fromTo(outletEl,
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', clearProps: 'transform' }
        );
      }
    }
  }

  ngOnInit() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => {
      const isHomePage = event.urlAfterRedirects === '/' || event.urlAfterRedirects === '/home' || event.urlAfterRedirects === '';
      this.isHome.set(isHomePage);

      // Exit video reveal mode on navigation
      this.exitVideoRevealMode();

      if (isPlatformBrowser(this.platformId)) {
        if ('scrollRestoration' in history) {
          history.scrollRestoration = 'manual';
        }
        // Kill any ongoing scroll animations immediately
        gsap.killTweensOf(window);

        // Safely close mobile navigation if open
        const navbarEl = document.getElementById('mainNavigation');
        if (navbarEl && navbarEl.classList.contains('show')) {
          navbarEl.classList.remove('show');
        }

        // Centralized viewport scroll & transition on every route change
        this.handleViewportScrollAndTransition(isHomePage);

        // Ensure ambient video is playing safely
        const videoEl = this.bannerVideo()?.nativeElement;
        if (videoEl) {
          videoEl.muted = true;
          const playPromise = videoEl.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {
              const fallbackEl = this.churchFallback()?.nativeElement;
              if (fallbackEl) {
                fallbackEl.style.opacity = '1';
              }
            });
          }
        }
      }
    });

    // Handle initial page load / refresh
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      const isHomePage = window.location.pathname === '/' || window.location.pathname === '/home' || window.location.pathname === '';
      this.handleViewportScrollAndTransition(isHomePage);
    }, { injector: this.injector });



    // Set up idle detection listeners (browser only)
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      const interactionEvents = ['mousemove', 'mousedown', 'touchstart', 'scroll', 'keydown', 'wheel'];
      const onUserActivity = () => {
        if (this.isVideoRevealed) {
          this.exitVideoRevealMode();
        }
        if (this.isHome()) {
          this.resetIdleTimer();
        }
      };

      interactionEvents.forEach(evt => {
        window.addEventListener(evt, onUserActivity, { passive: true });
      });

      // Background preloader for managing committee images so they load instantaneously
      this.preloadCommitteePhotos();

      // Start initial idle timer if on home
      if (this.isHome()) {
        this.startIdleTimer();
      }

      this.destroyRef.onDestroy(() => {
        interactionEvents.forEach(evt => {
          window.removeEventListener(evt, onUserActivity);
        });
        this.clearIdleTimer();
      });
    }, { injector: this.injector });
  }

  private preloadCommitteePhotos(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      // Lazy-load the office bearers data and pre-cache images in background
      import('./data/office-bearers.json').then((bearersModule) => {
        const dataList = bearersModule.data || bearersModule.default?.data;
        if (Array.isArray(dataList)) {
          const imageUrls = new Set<string>();
          dataList.forEach(group => {
            if (Array.isArray(group.people)) {
              group.people.forEach(person => {
                if (person.image && person.image.startsWith('http')) {
                  imageUrls.add(person.image);
                }
              });
            }
          });
          imageUrls.forEach(url => {
            const img = new Image();
            img.src = url;
          });
        }
      }).catch(() => {
        // Fallback or ignore if not reachable
      });
    } catch {
      // Ignore
    }
  }

  private startIdleTimer(): void {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => {
      if (this.isHome()) {
        this.enterVideoRevealMode();
      }
    }, this.IDLE_DELAY_MS);
  }

  private resetIdleTimer(): void {
    this.startIdleTimer();
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  private enterVideoRevealMode(): void {
    if (!isPlatformBrowser(this.platformId) || this.isVideoRevealed) return;
    this.isVideoRevealed = true;

    const videoContainer = document.querySelector('.ambient-video-canvas-container');
    const mainContent = document.getElementById('app-main-content');

    if (videoContainer) videoContainer.classList.add('video-reveal-mode');
    if (mainContent) mainContent.classList.add('video-reveal-mode');
  }

  private exitVideoRevealMode(): void {
    if (!this.isVideoRevealed) return;
    this.isVideoRevealed = false;

    if (!isPlatformBrowser(this.platformId)) return;

    const videoContainer = document.querySelector('.ambient-video-canvas-container');
    const mainContent = document.getElementById('app-main-content');

    if (videoContainer) videoContainer.classList.remove('video-reveal-mode');
    if (mainContent) mainContent.classList.remove('video-reveal-mode');
  }
}

