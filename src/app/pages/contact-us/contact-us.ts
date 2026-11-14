import { Component, signal, afterNextRender, DestroyRef, ElementRef, viewChild, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { data } from '../../data/contact.json';
import { MotionService, MOTION } from '../../services/motion.service';
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
  imports: [FormsModule],
  templateUrl: './contact-us.html',
  styleUrl: './contact-us.css'
})
export class ContactUs {
  contactInfo = signal<ContactUsData>(data);
  copiedToast = signal<boolean>(false);
  inquirySent = signal<boolean>(false);

  userName = '';
  userEmail = '';
  userSubject = 'Sacramental & Pastoral Counseling';
  userMessage = '';

  headerBlock = viewChild<ElementRef<HTMLElement>>('headerBlock');
  contactOverlay = viewChild<ElementRef<HTMLDivElement>>('contactOverlay');

  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);
  private motion = inject(MotionService);

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      let detachMotion: () => void = () => {};

      const ctx = gsap.context(() => {
        if (!this.motion.prefersReducedMotion) {
          // One intro timeline: cards overlap the header instead of waiting on fixed delays.
          const tl = gsap.timeline({ defaults: { ease: MOTION.ease.out, duration: MOTION.dur.base } });
          const headerEl = this.headerBlock()?.nativeElement;
          if (headerEl) tl.from(headerEl, { y: 24, autoAlpha: 0, clearProps: 'transform,opacity,visibility' });

          const cards = this.contactOverlay()?.nativeElement.querySelectorAll('.contact-card');
          if (cards?.length) {
            tl.from(cards, {
              y: 32, autoAlpha: 0,
              stagger: this.motion.cappedStagger(cards.length, 0.06),
              clearProps: 'transform,opacity,visibility'
            }, headerEl ? '<0.1' : 0);
          }
        }

        const host = document.querySelector('app-contact-us') as HTMLElement | null;
        if (host) detachMotion = this.motion.initPageAnimations(host);
      });

      this.destroyRef.onDestroy(() => {
        detachMotion();
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

  sendInquiry(event: Event): void {
    event.preventDefault();
    if (!this.userName || !this.userEmail || !this.userMessage) return;

    const toEmails = this.contactInfo().emails.map(e => e.address).join(',');
    const recipient = toEmails || 'Vicar@sdiocnz.org,Secretary@sdiocnz.org';
    const emailSubject = `[SDIOC Parish Inquiry] ${this.userSubject} - from ${this.userName}`;

    const emailBody = [
      `Dear Rev. Father & Parish Secretary,`,
      ``,
      `A new message has been submitted from the SDIOC Parish Website:`,
      ``,
      `--------------------------------------------------`,
      `Sender Name:    ${this.userName}`,
      `Sender Email:   ${this.userEmail}`,
      `Inquiry Nature: ${this.userSubject}`,
      `--------------------------------------------------`,
      ``,
      `Message:`,
      `${this.userMessage}`,
      ``,
      `--------------------------------------------------`,
      `St. Dionysius Indian Orthodox Church, Auckland`,
      `55 Keeling Road, Henderson, Auckland 0612, NZ`
    ].join('\n');

    const mailtoUrl = `mailto:${recipient}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

    if (isPlatformBrowser(this.platformId)) {
      window.location.href = mailtoUrl;
    }

    this.inquirySent.set(true);
  }
}

