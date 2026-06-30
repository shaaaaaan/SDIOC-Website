// app.ts
import { Component, ElementRef, ViewChild, inject, OnInit, afterNextRender, Injector } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { NavBar } from './common/nav-bar/nav-bar';
import {Footer} from './common/footer/footer';

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

  @ViewChild('mainOutlet', { static: true }) mainOutlet!: ElementRef<HTMLElement>;

  ngOnInit() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => {
      const isHome = event.urlAfterRedirects === '/' || event.urlAfterRedirects === '/home';

      // Defer DOM actions until the browser completes its next layout paint pass
      afterNextRender(() => {
        // Programmatically close the mobile navbar container dropdown
        const navbarEl = document.getElementById('mainNavigation');
        //@ts-ignore
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
          this.mainOutlet.nativeElement?.scrollIntoView({
            behavior: 'smooth',
            block: 'start' // Replaced 'inline: center' as it fights vertical layout calculations
          });
        }
      }, { injector: this.injector });
    });
  }
}
