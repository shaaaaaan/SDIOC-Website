import {Component, signal} from '@angular/core';
import {data} from '../../../data/church-history.json';

export interface ChurchHistoryData {
  churchInfo: ChurchInfo,
  milestones: Milestone[]
}

export interface Milestone {
  year: string,
  date: string,
  title: string,
  description: string
}
export interface ChurchInfo {
  name: string,
  affiliation: string,
  headquarters: string,
  founded_by: string
}

@Component({
  standalone: true,
  selector: 'app-church-history',
  imports: [],
  templateUrl: './church-history.html'
})
export class ChurchHistory {
  churchHistory = signal<ChurchHistoryData>(data);
}
