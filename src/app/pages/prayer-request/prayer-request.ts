import { Component, computed, inject, signal, afterNextRender, DestroyRef, ElementRef, viewChild, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ConfigService } from '../../services/config.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { gsap } from 'gsap';

@Component({
  standalone: true,
  selector: 'app-prayer-request',
  imports: [],
  templateUrl: './prayer-request.html',
  styleUrl: './prayer-request.css'
})
export class PrayerRequest {
  protected configService = inject(ConfigService);
  private sanitizer = inject(DomSanitizer);
  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);

  headerBlock = viewChild<ElementRef<HTMLElement>>('headerBlock');
  pastoralCard = viewChild<ElementRef<HTMLElement>>('pastoralCard');
  formCard = viewChild<ElementRef<HTMLElement>>('formCard');

  googleForm = signal(this.configService.configs());

  rawFormUrl = computed(() => {
    const dict = this.googleForm();
    if (dict && dict['forms.prayerRequest']) {
      return dict['forms.prayerRequest'];
    }
    return null;
  });

  formUrl = computed<SafeResourceUrl | null>(() => {
    const url = this.rawFormUrl();
    if (url) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
    return null;
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

        const pastoralEl = this.pastoralCard()?.nativeElement;
        if (pastoralEl) {
          gsap.from(pastoralEl, {
            y: 25,
            opacity: 0,
            duration: 0.8,
            delay: 0.15,
            ease: 'power2.out'
          });
        }

        const formEl = this.formCard()?.nativeElement;
        if (formEl) {
          gsap.from(formEl, {
            y: 35,
            opacity: 0,
            duration: 0.9,
            delay: 0.25,
            ease: 'power3.out'
          });
        }
      });

      this.destroyRef.onDestroy(() => {
        ctx.revert();
      });
    });
  }
}
