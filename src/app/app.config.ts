import {
  ApplicationConfig,
  provideZonelessChangeDetection,
  provideAppInitializer, // <-- Import the clean functional provider
  inject
} from '@angular/core';
import { provideRouter, withInMemoryScrolling, withPreloading, PreloadAllModules } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { ConfigService } from './services/config.service';
import { networkActivityInterceptor } from './interceptors/network-activity.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'disabled',
        anchorScrolling: 'enabled'
      }),
      // Fetch the other page chunks in the background once the app is idle,
      // so navigation stays instant after the initial load.
      withPreloading(PreloadAllModules)
    ),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptors([networkActivityInterceptor])),
    provideAppInitializer(() => {
      const configService = inject(ConfigService);
      return configService.initConfig(['common', 'home']);
    })
  ]
};
