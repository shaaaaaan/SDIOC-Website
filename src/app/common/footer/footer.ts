import { Component, PLATFORM_ID, inject, afterNextRender } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MotionService } from '../../services/motion.service';

@Component({
  standalone: true,
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.css'
})
export class Footer {
  private platformId = inject(PLATFORM_ID);
  private motion = inject(MotionService);

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      const footerEl = document.querySelector('.sdioc-master-footer') as HTMLElement;
      if (footerEl) {
        this.motion.initPageAnimations(footerEl);
      }
    });
  }

  openGoogleMaps(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.open('https://maps.google.com/?q=55+Keeling+Rd,+Henderson,+Auckland+0612', '_blank')?.focus();
    }
  }
}

