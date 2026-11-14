import { Component, PLATFORM_ID, inject, afterNextRender } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MotionService } from '../../services/motion.service';
import { version } from '../../../environments/version';
import { ConfigService } from '../../services/config.service';

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
  protected contact = inject(ConfigService).contact;

  readonly commitHash = version.commit;
  readonly builtAt = version.builtAt;

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
      window.open(this.contact().mapsUrl, '_blank')?.focus();
    }
  }
}

