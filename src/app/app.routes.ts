import { Routes } from '@angular/router';
import {AboutUs} from './pages/about-us/about-us';
import {ContactUs} from './pages/contact-us/contact-us';
import {Downloads} from './pages/downloads/downloads';
import {OfficeBearers} from './pages/office-bearers/office-bearers';
import {Home} from './pages/home/home';

export const routes: Routes = [{
  path: '',
  component: Home
},{
  path: 'home',
  component: Home
},{
  path: 'about-us',
  component: AboutUs
},{
  path: 'contact-us',
  component: ContactUs
},{
  path: 'downloads',
  component: Downloads
},{
  path: 'office-bearers',
  component: OfficeBearers
}];

