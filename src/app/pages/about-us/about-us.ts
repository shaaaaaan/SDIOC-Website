import { Component } from '@angular/core';
import {ChurchHistory} from './church-history/church-history';
@Component({
  standalone: true,
  selector: 'app-about-us',
  imports: [
    ChurchHistory
  ],
  templateUrl: './about-us.html'
})
export class AboutUs {}
