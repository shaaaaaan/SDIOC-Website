import { Component, computed, signal, afterNextRender, DestroyRef, ElementRef, viewChild, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import ministriesData from '../../data/ministries.json';
import { MotionService, MOTION } from '../../services/motion.service';
import { ConfigService } from '../../services/config.service';
import { gsap } from 'gsap';

@Component({
  standalone: true,
  selector: 'app-contact-us',
  imports: [FormsModule],
  templateUrl: './contact-us.html',
  styleUrl: './contact-us.css'
})
export class ContactUs {
  private configService = inject(ConfigService);

  /** Address, PO box and leadership directory, all from the Google Sheet. */
  contactInfo = this.configService.contact;

  private static readonly SCHEDULE_ICONS = ['bi-sun-fill', 'bi-moon-stars-fill', 'bi-stars'];

  /** Weekly schedule from the sheet: bannerN.line1 (name), line2 (time), line4 (description). */
  schedule = computed(() =>
    this.configService.services().map((svc, i) => ({
      icon: ContactUs.SCHEDULE_ICONS[i] ?? 'bi-clock',
      label: svc.label,
      time: svc.time,
      detail: svc.detail,
    }))
  );
  copiedToast = signal<boolean>(false);
  inquirySent = signal<boolean>(false);

  userName = '';
  userEmail = '';
  userSubject = 'Sacramental & Pastoral Counseling';
  userMessage = '';
  userMinistry = '';

  readonly MINISTRY_SUBJECT = 'Join a Spiritual Organisation / Ministry';
  readonly ministries = ministriesData.ministries.map(m => ({ id: m.id, title: m.title }));

  /** Set when arriving from a ministry's "Inquire & Join" button: the page lands on this form. */
  focusInquiry = false;

  headerBlock = viewChild<ElementRef<HTMLElement>>('headerBlock');
  contactOverlay = viewChild<ElementRef<HTMLDivElement>>('contactOverlay');
  nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');
  ministrySelect = viewChild<ElementRef<HTMLSelectElement>>('ministrySelect');

  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);
  private motion = inject(MotionService);
  private route = inject(ActivatedRoute);

  constructor() {
    const params = this.route.snapshot.queryParamMap;
    if (params.get('enquiry') === 'ministry') {
      this.focusInquiry = true;
      this.userSubject = this.MINISTRY_SUBJECT;
      const id = params.get('ministry') ?? '';
      if (this.ministries.some(m => m.id === id)) this.userMinistry = id;
    }

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

      // Focus the form without jumping; the navigation glide brings it into view.
      // Waits for the card intro (cards start hidden, and hidden fields can't take focus).
      if (this.focusInquiry) {
        const focusTimer = setTimeout(() => {
          if (document.activeElement && document.activeElement !== document.body) return;
          const field = this.userMinistry ? this.nameInput() : this.ministrySelect();
          field?.nativeElement.focus({ preventScroll: true });
        }, this.motion.prefersReducedMotion ? 0 : 900);
        this.destroyRef.onDestroy(() => clearTimeout(focusTimer));
      }

      this.destroyRef.onDestroy(() => {
        detachMotion();
        ctx.revert();
      });
    });
  }

  private get ministryTitle(): string {
    return this.ministries.find(m => m.id === this.userMinistry)?.title ?? '';
  }

  copyAddress(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const address = this.contactInfo().address;
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
    const isMinistry = this.userSubject === this.MINISTRY_SUBJECT;
    if (isMinistry && !this.userMinistry) return;
    const subject = isMinistry ? `${this.userSubject}: ${this.ministryTitle}` : this.userSubject;

    const recipient = this.contactInfo().emails.map(e => e.address).join(',');
    const emailSubject = `[SDIOC Parish Inquiry] ${subject} - from ${this.userName}`;

    const emailBody = [
      `Dear Rev. Father & Parish Secretary,`,
      ``,
      `A new message has been submitted from the SDIOC Parish Website:`,
      ``,
      `--------------------------------------------------`,
      `Sender Name:    ${this.userName}`,
      `Sender Email:   ${this.userEmail}`,
      `Inquiry Nature: ${this.userSubject}`,
      ...(isMinistry ? [`Ministry:       ${this.ministryTitle}`] : []),
      `--------------------------------------------------`,
      ``,
      `Message:`,
      `${this.userMessage}`,
      ``,
      `--------------------------------------------------`,
      `St. Dionysius Indian Orthodox Church, Auckland`,
      this.contactInfo().address
    ].join('\n');

    const mailtoUrl = `mailto:${recipient}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

    if (isPlatformBrowser(this.platformId)) {
      window.location.href = mailtoUrl;
    }

    this.inquirySent.set(true);
  }
}

