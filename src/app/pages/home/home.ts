import {Component, inject} from '@angular/core';
import {ConfigService} from '../../services/config.service';

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [],
  templateUrl: './home.html'
})
export class Home {
  // Expose the signals object to the HTML view directly
  protected configService = inject(ConfigService);
  get googleForm() { return this.configService.configs(); }
}
