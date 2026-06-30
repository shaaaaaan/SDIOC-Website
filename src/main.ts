import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app'; // Points to your custom App class setup
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
