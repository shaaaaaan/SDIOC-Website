import { Injectable, PLATFORM_ID, inject, ElementRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

@Injectable({
  providedIn: 'root'
})
export class MotionService {
  private platformId = inject(PLATFORM_ID);
  readonly isBrowser = isPlatformBrowser(this.platformId);

  constructor() {
    if (this.isBrowser) {
      gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
    }
  }

  /**
   * Safely create a scoped GSAP Context.
   * Cleans up all ScrollTriggers and tweens created within the scope when context.revert() is called.
   */
  createContext(scope: HTMLElement | ElementRef<HTMLElement> | undefined, callback: (ctx: gsap.Context) => void): gsap.Context | undefined {
    if (!this.isBrowser) return undefined;
    const targetScope = scope instanceof ElementRef ? scope.nativeElement : scope;
    return gsap.context(callback, targetScope);
  }

  /**
   * Animate element entrance with a smooth cinematic fade and slide up
   */
  fadeUp(targets: gsap.DOMTarget, vars: gsap.TweenVars = {}): gsap.core.Tween | undefined {
    if (!this.isBrowser) return undefined;
    return gsap.from(targets, {
      y: 40,
      opacity: 0,
      duration: 1.1,
      ease: 'power3.out',
      stagger: 0.1,
      ...vars
    });
  }

  /**
   * Staggered word reveal for titles and monumental headers
   */
  animateWords(elementOrSelector: HTMLElement | string, vars: gsap.TweenVars = {}): gsap.core.Timeline | undefined {
    if (!this.isBrowser) return undefined;
    const el = typeof elementOrSelector === 'string' ? document.querySelector(elementOrSelector) as HTMLElement : elementOrSelector;
    if (!el || el.dataset['gsapWordsInit']) return undefined;

    el.dataset['gsapWordsInit'] = 'true';
    const originalText = el.innerText.trim();
    if (!originalText) return undefined;

    const words = originalText.split(/\s+/);
    el.innerHTML = words
      .map(word => `<span class="gsap-word-wrapper" style="display:inline-block;overflow:hidden;vertical-align:bottom;"><span class="gsap-word" style="display:inline-block;transform:translateY(115%);opacity:0;">${word}</span></span>`)
      .join(' ');

    const wordEls = el.querySelectorAll('.gsap-word');
    const tl = gsap.timeline({
      scrollTrigger: vars['scrollTrigger'] || {
        trigger: el,
        start: 'top 88%',
        once: true
      }
    });

    tl.to(wordEls, {
      y: '0%',
      opacity: 1,
      duration: 0.85,
      stagger: 0.05,
      ease: 'power3.out',
      clearProps: 'transform,opacity',
      ...vars
    });

    return tl;
  }

  /**
   * Smoothly scroll window or element to a specific target
   */
  scrollTo(target: string | number | HTMLElement, offset = 0): void {
    if (!this.isBrowser) return;
    gsap.to(window, {
      duration: 0.9,
      scrollTo: { y: target, offsetY: offset },
      ease: 'power3.inOut'
    });
  }

  /**
   * Trigger a refresh on ScrollTrigger (useful after dynamic content loads or route changes)
   */
  refreshScrollTrigger(): void {
    if (this.isBrowser) {
      ScrollTrigger.refresh();
    }
  }
}
