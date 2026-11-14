// config.service.ts
import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { configsSheetId } from '../../app/data/configs.json';

export interface ConfigMap {
  [key: string]: string;
}

const SERVICE_DEFAULTS = [
  ['bi-brightness-high', 'Holy Qurbana \u2022 Sunday', '8:30 AM'],
  ['bi-moon-stars', 'Evening Prayer \u2022 Wednesday', '7:00 PM'],
  ['bi-calendar2-event', 'Evening Prayer \u2022 Saturday', '7:00 PM'],
] as const;

/** Contact-page descriptions for each service; overridden by bannerN.line4 in the sheet. */
const SERVICE_DETAILS = [
  'Morning Prayer (Prabhatam) \u2022 8:30 AM \u00b7 Divine Liturgy \u2022 9:30 AM followed by Fellowship',
  'Sandhya Namaskaram & Intercession',
  'Sandhya Namaskaram & Sacramental Preparation',
];

/** Leadership phones after the Church DDI; overridden by contact.phoneN.label / .number. */
const CONTACT_PHONE_DEFAULTS = [
  ['Vicar', '+64 275 81 4215'],
  ['Trustee', '+64 210 28 87143'],
  ['Secretary', '+64 221 670 775'],
] as const;

/** Emails listed before the Secretary (goldStrip.col3); overridden by contact.emailN.label / .address. */
const CONTACT_EMAIL_DEFAULTS = [['Vicar', 'Vicar@sdiocnz.org']] as const;

const telHref = (n: string) => 'tel:' + n.replace(/[^\d+]/g, '');

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private http = inject(HttpClient);
  private spreadsheetId = configsSheetId;

  // Expose an immutable read-only state for templates to bind to
  private configState = signal<ConfigMap>({});
  readonly configs = this.configState.asReadonly();

  /** Sheet value with non-breaking spaces stripped, so a "blank" cell reads as empty. */
  value(key: string): string {
    return (this.configState()[key] ?? '').replace(/\u00a0/g, ' ').trim();
  }

  /**
   * Weekly services shown in the home HUD and the nav info panel.
   * Each field comes from the "home" sheet (bannerN.line1-3), falling back to the defaults below.
   */
  readonly services = computed(() =>
    SERVICE_DEFAULTS.map(([icon, label, time], i) => {
      const key = `banner${i + 1}`;
      return {
        icon,
        label: this.value(`${key}.line1`) || label,
        time: this.value(`${key}.line2`) || time,
        note: this.value(`${key}.line3`),
        /** Longer description used on the Contact page. */
        detail: this.value(`${key}.line4`) || SERVICE_DETAILS[i],
      };
    })
  );

  /**
   * Church contact details. Address, main phone and main email come from the "home" tab
   * (goldStrip.col1-3); the PO box and the leadership directory come from the "common" tab (contact.*).
   */
  readonly contact = computed(() => {
    const address = this.value('goldStrip.col1') || '55 Keeling Rd, Henderson, Auckland 0612, New Zealand';
    const phone = this.value('goldStrip.col2') || '+64 9 948 5215';
    const email = this.value('goldStrip.col3') || 'Secretary@sdiocnz.org';
    const parts = address.split(',').map((p) => p.trim()).filter(Boolean);

    const phones = [
      { label: 'Church DDI', number: phone },
      ...CONTACT_PHONE_DEFAULTS.map(([label, number], i) => ({
        label: this.value(`contact.phone${i + 1}.label`) || label,
        number: this.value(`contact.phone${i + 1}.number`) || number,
      })),
    ].map((p) => ({ ...p, href: telHref(p.number) }));

    const emails = [
      ...CONTACT_EMAIL_DEFAULTS.map(([label, addr], i) => ({
        label: this.value(`contact.email${i + 1}.label`) || label,
        address: this.value(`contact.email${i + 1}.address`) || addr,
      })),
      { label: 'Secretary', address: email },
    ];

    return {
      address,
      /** e.g. "55 Keeling Rd, Henderson" */
      addressLine1: parts.slice(0, 2).join(', '),
      /** e.g. "Auckland 0612, New Zealand" */
      addressLine2: parts.slice(2).join(', '),
      mapsUrl: 'https://maps.google.com/?q=' + encodeURIComponent(address),
      poBox: this.value('contact.poBox') || 'P.O Box# 21728, Henderson, Auckland-0650',
      phone,
      phoneHref: telHref(phone),
      email,
      phones,
      emails,
    };
  });

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
