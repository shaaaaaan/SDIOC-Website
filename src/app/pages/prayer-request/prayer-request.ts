import { Component, computed, inject, signal, afterNextRender, DestroyRef, ElementRef, viewChild, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ConfigService } from '../../services/config.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MotionService, MOTION } from '../../services/motion.service';
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
  private motion = inject(MotionService);

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

      let detachMotion: () => void = () => {};

      const ctx = gsap.context(() => {
        if (!this.motion.prefersReducedMotion) {
          const els = [this.headerBlock(), this.pastoralCard(), this.formCard()]
            .map(r => r?.nativeElement)
            .filter((e): e is HTMLElement => !!e);
          if (els.length) {
            gsap.from(els, {
              y: 26, autoAlpha: 0,
              duration: MOTION.dur.base,
              ease: MOTION.ease.out,
              stagger: 0.08,
              clearProps: 'transform,opacity,visibility'
            });
          }
        }

        const host = document.querySelector('app-prayer-request') as HTMLElement | null;
        if (host) detachMotion = this.motion.initPageAnimations(host);
      });

      this.destroyRef.onDestroy(() => {
        detachMotion();
        ctx.revert();
      });
    });
  }
}

