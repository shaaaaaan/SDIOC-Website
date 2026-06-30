import {Component, signal} from '@angular/core';
import { data } from '../../data/resources.json';

export interface ResourceCategory {
  categoryName: string,
  items: ResourceItem[]
}

export interface ResourceItem {
  name: string,
  url: string
}

@Component({
  standalone: true,
  selector: 'app-downloads',
  imports: [],
  templateUrl: './downloads.html'
})
export class Downloads {
  resourceCategories = signal<ResourceCategory[]>(data);
}
