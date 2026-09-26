// app.ts
import { Component, ElementRef, inject, OnInit, afterNextRender, Injector, viewChild, DestroyRef, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { NavBar } from './common/nav-bar/nav-bar';
import { Footer } from './common/footer/footer';
import { Cursor } from './common/cursor/cursor';
import { MotionService } from './services/motion.service';
import { gsap } from 'gsap';

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
  churchImg = viewChild<ElementRef<HTMLImageElement>>('church');

  ngOnInit() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => {
      const isHome = event.urlAfterRedirects === '/' || event.urlAfterRedirects === '/home';

      // Defer actions until browser paint pass
      afterNextRender(() => {
        if (!isPlatformBrowser(this.platformId)) return;

        // Safely close mobile navigation if open
        const navbarEl = document.getElementById('mainNavigation');
        if (navbarEl && navbarEl.classList.contains('show')) {
          navbarEl.classList.remove('show');
        }

        const outlet = this.mainOutlet()?.nativeElement;

        if (isHome) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (outlet) {
          outlet.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Ambient cinematic subtle breathing on the hero church image
        const imgEl = this.churchImg()?.nativeElement;
        if (imgEl && isHome) {
          gsap.to(imgEl, {
            scale: 1.05,
            duration: 12,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true
          });
        }

        this.motion.refreshScrollTrigger();
      }, { injector: this.injector });
    });
  }
}
