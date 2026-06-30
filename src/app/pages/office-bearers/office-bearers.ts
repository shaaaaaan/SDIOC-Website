import {Component, signal} from '@angular/core';
import {data} from '../../data/office-bearers.json';

export interface OfficeBearersData {
  year: string,
  people: Person[]
}

export interface Person {
  name: string,
  position: string,
  image: string
}
@Component({
  standalone: true,
  selector: 'app-office-bearers',
  templateUrl: './office-bearers.html'
})
export class OfficeBearers {
  selectedYear = signal(new Date().getFullYear());
  officeBearers = signal<OfficeBearersData[]>(data);
}
