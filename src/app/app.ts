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

  ngOnInit() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => {
      const isHomePage = event.urlAfterRedirects === '/' || event.urlAfterRedirects === '/home' || event.urlAfterRedirects === '';
      this.isHome.set(isHomePage);

      // Exit video reveal mode on navigation
      this.exitVideoRevealMode();

      // Defer actions until browser paint pass
      afterNextRender(() => {
        if (!isPlatformBrowser(this.platformId)) return;

        // Safely close mobile navigation if open
        const navbarEl = document.getElementById('mainNavigation');
        if (navbarEl && navbarEl.classList.contains('show')) {
          navbarEl.classList.remove('show');
        }

        if (isHomePage) {
          // Force instantaneous reset to top of page on home
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
          // Start idle timer for video reveal on home page
          this.startIdleTimer();
        } else {
          // On subpages, scroll to first content block so user sees content directly and can scroll up to view full video
          const scrollToContent = () => {
            const contentTarget = document.getElementById('page-content-start');
            if (contentTarget) {
              contentTarget.scrollIntoView({ behavior: 'instant', block: 'start' });
            } else {
              window.scrollTo({ top: window.innerHeight * 0.94, behavior: 'instant' });
            }
          };
          
          scrollToContent();
          setTimeout(scrollToContent, 40);
          setTimeout(scrollToContent, 120);
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

