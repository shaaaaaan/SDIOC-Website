import { Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-footer',
  imports: [],
  templateUrl: './footer.html'
})
export class Footer {
  openGoogleMaps() {
    window.open('https://www.google.com/maps/place/St.+Dionysius+Indian+Orthodox+Church+(SDIOC)/data=!4m2!3m1!1s0x0:0x7222ea64f974a95b')?.focus();
  }
}
