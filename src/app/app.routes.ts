import { Routes } from '@angular/router';
import { Home } from './pages/home/home';

// Home stays in the initial bundle (it is the landing/LCP route);
// every other page is split into its own lazily-loaded chunk.
export const routes: Routes = [{
  path: '',
  component: Home
},{
  path: 'about-us',
  loadComponent: () => import('./pages/about-us/about-us').then(m => m.AboutUs)
},{
  path: 'ministries',
  loadComponent: () => import('./pages/ministries/ministries').then(m => m.Ministries)
},{
  path: 'contact-us',
  loadComponent: () => import('./pages/contact-us/contact-us').then(m => m.ContactUs)
},{
  path: 'downloads',
  loadComponent: () => import('./pages/downloads/downloads').then(m => m.Downloads)
},{
  path: 'office-bearers',
  loadComponent: () => import('./pages/office-bearers/office-bearers').then(m => m.OfficeBearers)
},{
  path: 'prayer-request',
  loadComponent: () => import('./pages/prayer-request/prayer-request').then(m => m.PrayerRequest)
}];
