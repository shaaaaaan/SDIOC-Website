import {
  ApplicationConfig,
  provideZonelessChangeDetection,
  provideAppInitializer, // <-- Import the clean functional provider
  inject
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { routes } from './app.routes';
import { ConfigService } from './services/config.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch()),
    provideAppInitializer(() => {
      const configService = inject(ConfigService);
      return configService.initConfig(['common', 'home']);
    })
  ]
};
