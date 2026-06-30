import {Component, computed, inject, signal} from '@angular/core';
import {ConfigService} from '../../services/config.service';
import {DomSanitizer} from '@angular/platform-browser';

@Component({
  standalone: true,
  selector: 'app-prayer-request',
  imports: [],
  templateUrl: './prayer-request.html'
})
export class PrayerRequest {
  // Expose the signals object to the HTML view directly
  protected configService = inject(ConfigService);
  private sanitizer = inject(DomSanitizer);
  googleForm = signal(this.configService.configs());
  formUrl = computed(() => {
    let googleFormDict = this.googleForm();
    if (googleFormDict) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(googleFormDict['forms.prayerRequest']);
    }
    return null;
  });
}
