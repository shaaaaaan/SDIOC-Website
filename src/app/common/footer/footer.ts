import { Component, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.css'
})
export class Footer {
  private platformId = inject(PLATFORM_ID);

  openGoogleMaps(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.open('https://maps.google.com/?q=55+Keeling+Rd,+Henderson,+Auckland+0612', '_blank')?.focus();
    }
  }
}
