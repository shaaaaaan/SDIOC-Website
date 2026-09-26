import { Component, signal, afterNextRender, DestroyRef, ElementRef, viewChild, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { data } from '../../data/contact.json';
import { gsap } from 'gsap';

export interface ContactUsData {
  location: ContactLocation;
  phones: ContactPhone[];
  emails: ContactEmail[];
}

export interface ContactLocation {
  address: string;
  poBox: string;
}

export interface ContactPhone {
  label: string;
  number: string;
}

export interface ContactEmail {
  label: string;
  address: string;
}

@Component({
  standalone: true,
  selector: 'app-contact-us',
  imports: [],
  templateUrl: './contact-us.html',
  styleUrl: './contact-us.css'
})
export class ContactUs {
  contactInfo = signal<ContactUsData>(data);
  copiedToast = signal<boolean>(false);

  headerBlock = viewChild<ElementRef<HTMLElement>>('headerBlock');
  contactGrid = viewChild<ElementRef<HTMLDivElement>>('contactGrid');

  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      const ctx = gsap.context(() => {
        const headerEl = this.headerBlock()?.nativeElement;
        if (headerEl) {
          gsap.from(headerEl, {
            y: 35,
            opacity: 0,
            duration: 0.9,
            ease: 'power3.out'
          });
        }

        const gridEl = this.contactGrid()?.nativeElement;
        if (gridEl) {
          const cards = gridEl.querySelectorAll('.contact-card');
          gsap.from(cards, {
            y: 35,
            opacity: 0,
            duration: 0.8,
            stagger: 0.1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: gridEl,
              start: 'top 85%'
            }
          });
        }
      });

      this.destroyRef.onDestroy(() => {
        ctx.revert();
      });
    });
  }

  copyAddress(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const address = this.contactInfo().location.address;
    navigator.clipboard.writeText(address).then(() => {
      this.copiedToast.set(true);
      setTimeout(() => {
        this.copiedToast.set(false);
      }, 3000);
    });
  }
}
