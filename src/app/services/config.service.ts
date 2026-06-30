// config.service.ts
import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { configsSheetId } from '../../app/data/configs.json';

export interface ConfigMap {
  [key: string]: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private http = inject(HttpClient);
  private spreadsheetId = configsSheetId;

  // Expose an immutable read-only state for templates to bind to
  private configState = signal<ConfigMap>({});
  readonly configs = this.configState.asReadonly();

  /**
   * Initializes multi-sheet configuration and populates the signal.
   */
  async initConfig(sheetNames: string[]): Promise<void> {
    const configMap: ConfigMap = {};

    try {
      const fetchPromises = sheetNames.map(async (sheetName) => {
        const url = `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;

        try {
          // Convert RxJS HttpClient observable to native promise
          const rawText = await firstValueFrom(this.http.get(url, { responseType: 'text' }));

          // Parse out Google's wrapper string wrapper: google.visualization.Query.setResponse({...});
          const startIdx = rawText.indexOf('{');
          const endIdx = rawText.lastIndexOf('}') + 1;
          const jsonString = rawText.substring(startIdx, endIdx);
          const parsed = JSON.parse(jsonString);

          if (parsed?.table?.rows) {
            parsed.table.rows.forEach((row: any) => {
              if (row.c?.[0] && row.c?.[1] !== undefined) {
                const key = row.c[0]?.v?.toString().trim();
                const value = row.c[1]?.f !== undefined ? row.c[1]?.f : row.c[1]?.v;

                if (key && !configMap.hasOwnProperty(key)) {
                  configMap[key] = value !== null ? value.toString() : '';
                }
              }
            });
          }
        } catch (err) {
          console.error(`Error loading tab "${sheetName}":`, err);
        }
      });

      await Promise.all(fetchPromises);
      this.configState.set(configMap); // Update our application state signal
      console.log(`Successfully mapped ${Object.keys(configMap).length} configuration keys.`);
    } catch (error) {
      console.error('Critical failure during sheet config generation:', error);
    }
  }
}
