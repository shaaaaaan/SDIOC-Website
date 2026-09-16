// app.ts
import { Component, ElementRef, ViewChild, inject, OnInit, afterNextRender, Injector, viewChild } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { NavBar } from './common/nav-bar/nav-bar';
import {Footer} from './common/footer/footer';
import { gsap } from 'gsap';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [RouterOutlet, NavBar, Footer],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private router = inject(Router);
  private injector = inject(Injector); // Required to run render hooks inside observables

  // @ViewChild('mainOutlet', { static: true }) mainOutlet!: ElementRef<HTMLElement>;

  private marqueeAnimation?: gsap.core.Tween;
  mainOutlet = viewChild.required<ElementRef<HTMLElement>>('mainOutlet');
  lightRayContainer = viewChild.required<ElementRef<HTMLDivElement>>('lightRaysContainer');
  churchImg = viewChild.required<ElementRef<HTMLImageElement>>('church');
  
  ngOnInit() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => {
      const isHome = event.urlAfterRedirects === '/' || event.urlAfterRedirects === '/home';

      // Defer DOM actions until the browser completes its next layout paint pass
      afterNextRender(() => {
        // Programmatically close the mobile navbar container dropdown
        const navbarEl = document.getElementById('mainNavigation');
        if (navbarEl && typeof bootstrap !== 'undefined') {
          // Pull the existing Bootstrap Collapse state instance safely
          //@ts-ignore
          const bsCollapse = bootstrap.Collapse.getInstance(navbarEl);

          // Only trigger hiding sequence if it's currently open (has the 'show' utility class)
          if (bsCollapse && navbarEl.classList.contains('show')) {
            bsCollapse.hide();
          }
        }

        if (isHome) {
          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        } else {
          this.mainOutlet().nativeElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start' // Replaced 'inline: center' as it fights vertical layout calculations
          });
        }
        // gsap.effects['explode'](this.churchImg().nativeElement, {
        //   direction: "up", //can reference any properties that the author decides - in this case "direction"
        //   duration: 3,
        // });
        gsap.to(this.churchImg().nativeElement, {
          transformOrigin: "top center",
          duration: 20, // Slow, variable durations
          // opacity: gsap.utils.random(0.7, 1),
          // scaleY: gsap.utils.random(1.1, 1.4), // Stretch downward slightly
          // skewX: gsap.utils.random(0, 2), // Very subtle sway
          // y: 5,
          scale: 1.1,
          // ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          delay: gsap.utils.random(0, 2)
        });
        
        // Target all individual polygon rays
        // const rays = gsap.utils.toArray<Element>(this.lightRayContainer().nativeElement.querySelectorAll('.ray'));
        // rays.forEach((ray) => {
        //   // Set initial random state so they don't all start identical
        //   gsap.set(ray, {
        //     transformOrigin: "top center",
        //     opacity: gsap.utils.random(0.3, 0.6),
        //     scaleY: gsap.utils.random(0.8, 1)
        //   });

        //   // Animate the shimmering and stretching
        //   gsap.to(ray, {
        //     duration: gsap.utils.random(1, 2), // Slow, variable durations
        //     opacity: gsap.utils.random(0.7, 1),
        //     scaleY: gsap.utils.random(1.1, 1.4), // Stretch downward slightly
        //     skewX: gsap.utils.random(-2, 2), // Very subtle sway
        //     ease: "sine.inOut",
        //     repeat: -1,
        //     yoyo: true,
        //     delay: gsap.utils.random(0, 2)
        //   });
        // });
      }, { injector: this.injector });
    });
  }
}
