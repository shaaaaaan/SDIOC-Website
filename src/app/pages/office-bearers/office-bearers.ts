import { Component, computed, signal, afterNextRender, DestroyRef, ElementRef, viewChild, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser, NgTemplateOutlet } from '@angular/common';
import { data } from '../../data/office-bearers.json';
import { MotionService, MOTION } from '../../services/motion.service';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export interface OfficeBearersData {
  year: string;
  people: Person[];
}

export interface Person {
  name: string;
  position: string;
  image: string;
}

/** Roles shown in the top "office bearers" row, in reading order. */
const LEAD_ROLES = ['Vicar', 'Trustee', 'Secretary'];

/** Easing factor per frame for the pointer parallax (tilt amounts live in CSS). */
const LERP = 0.12;

interface TiltState {
  frame: HTMLElement;
  tx: number; ty: number; // target  [-1, 1]
  x: number;  y: number;  // current [-1, 1]
}

@Component({
  standalone: true,
  selector: 'app-office-bearers',
  imports: [NgTemplateOutlet],
  templateUrl: './office-bearers.html',
  styleUrl: './office-bearers.css'
})
export class OfficeBearers {
  officeBearers = signal<OfficeBearersData[]>(data);

  /** Most recent term in the data file. */
  currentTerm = computed(() =>
    [...this.officeBearers()].sort((a, b) => Number(b.year) - Number(a.year))[0]
  );

  leaders = computed(() => {
    const people = this.currentTerm()?.people ?? [];
    return LEAD_ROLES
      .map(role => people.find(p => p.position === role))
      .filter((p): p is Person => !!p);
  });

  members = computed(() => {
    const people = this.currentTerm()?.people ?? [];
    return people.filter(p => !LEAD_ROLES.includes(p.position));
  });

  memberCount = computed(() => this.currentTerm()?.people.length ?? 0);

  headerBlock = viewChild<ElementRef<HTMLElement>>('headerBlock');
  pageRoot = viewChild<ElementRef<HTMLElement>>('pageRoot');

  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);
  private motion = inject(MotionService);

  isClergy(person: Person): boolean {
    return person.position === 'Vicar' || /\b(Rev|Fr)\./.test(person.name);
  }

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      gsap.registerPlugin(ScrollTrigger);

      const root = this.pageRoot()?.nativeElement;
      if (!root) return;

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

      const ctx = gsap.context(() => {
        if (reduceMotion) return;

        const headerEl = this.headerBlock()?.nativeElement;
        if (headerEl) {
          gsap.from(headerEl, { y: 24, autoAlpha: 0, duration: MOTION.dur.base, ease: MOTION.ease.out, clearProps: 'all' });
        }

        // Reveal: animates the outer <article>; the tilt lives on the inner frame,
        // so the two never fight over the same transform. revealBatch hides the cards
        // up front; a gsap.from inside onEnter left them visible until the trigger hit,
        // then snapped them to 0 and faded back in (a visible blink).
        this.motion.revealBatch(root.querySelectorAll('.cm-card'), { y: 32 });

        root.querySelectorAll<HTMLElement>('.cm-section-head').forEach(head => {
          gsap.from(head, {
            y: 16, autoAlpha: 0, duration: MOTION.dur.base, ease: MOTION.ease.out, clearProps: 'all',
            scrollTrigger: { trigger: head, start: 'top 92%', once: true }
          });
        });
      }, root);

      const detachTilt = finePointer && !reduceMotion ? this.attachPointerParallax(root) : () => {};

      // Shared page behaviour (title char reveal, watermark drift).
      const detachMotion = this.motion.initPageAnimations(root);

      this.destroyRef.onDestroy(() => {
        detachTilt();
        detachMotion();
        ctx.revert();
      });
    });
  }

  /**
   * One smooth, layered parallax per card, driven by CSS custom properties:
   *  --tx/--ty  : pointer position in [-1, 1], eased with a lerp each frame
   * CSS turns these into frame tilt, a counter-moving halo (depth) and a glare
   * that follows the light. The portrait itself never moves relative to its frame.
   */
  private attachPointerParallax(root: HTMLElement): () => void {
    const states = new Map<HTMLElement, TiltState>();
    let raf = 0;

    const tick = () => {
      let active = false;
      states.forEach((s, card) => {
        s.x += (s.tx - s.x) * LERP;
        s.y += (s.ty - s.y) * LERP;
        const settled = Math.abs(s.tx - s.x) < 0.001 && Math.abs(s.ty - s.y) < 0.001;
        if (settled) { s.x = s.tx; s.y = s.ty; } else { active = true; }
        s.frame.style.setProperty('--tx', s.x.toFixed(4));
        s.frame.style.setProperty('--ty', s.y.toFixed(4));
        if (settled && s.tx === 0 && s.ty === 0) states.delete(card);
      });
      raf = active ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };

    const stateFor = (card: HTMLElement): TiltState | undefined => {
      let s = states.get(card);
      if (!s) {
        const frame = card.querySelector<HTMLElement>('.cm-card__frame');
        if (!frame) return undefined;
        s = { frame, tx: 0, ty: 0, x: 0, y: 0 };
        states.set(card, s);
      }
      return s;
    };

    const onMove = (e: PointerEvent) => {
      const card = (e.currentTarget as HTMLElement);
      const s = stateFor(card);
      if (!s) return;
      const r = card.getBoundingClientRect();
      s.tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      s.ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      kick();
    };
    const onLeave = (e: PointerEvent) => {
      const s = states.get(e.currentTarget as HTMLElement);
      if (!s) return;
      s.tx = 0; s.ty = 0;
      kick();
    };

    const cards = Array.from(root.querySelectorAll<HTMLElement>('.cm-card'));
    cards.forEach(c => {
      c.addEventListener('pointermove', onMove);
      c.addEventListener('pointerleave', onLeave);
    });

    return () => {
      cancelAnimationFrame(raf);
      cards.forEach(c => {
        c.removeEventListener('pointermove', onMove);
        c.removeEventListener('pointerleave', onLeave);
      });
    };
  }
}
