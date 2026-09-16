import { afterNextRender, Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { gsap } from 'gsap';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import SplitText from 'gsap/src/SplitText.js';

@Component({
  standalone: true,
  selector: 'app-nav-bar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav-bar.html'
})
export class NavBar {
  churchTitle = viewChild.required<ElementRef<HTMLDivElement>>('churchTitle');
  churchSubTitle = viewChild.required<ElementRef<HTMLDivElement>>('churchSubTitle');

  clouds = viewChild.required<ElementRef<HTMLDivElement>>('clouds');
  imgSrc = signal(`images/common/image-from-rawpixel-id-6119797-png.png`);
  private marqueeAnimation?: gsap.core.Tween;
  private destroyRef = inject(DestroyRef);
  constructor() {
    gsap.registerPlugin(ScrambleTextPlugin, SplitText);
    afterNextRender(() => {
      SplitText.create(this.churchTitle().nativeElement, {type: ""});
      // , {
      //   type: "",
      //   smartWrap: true
      // }
      // gsap.to([this.churchTitle().nativeElement, this.churchSubTitle().nativeElement], {
      //   duration: 10,
      //   scrambleText: "{original}",
      //   yoyo: true,
      //   repeat: -1,
      //   chars: ['W', 'E']
      // });
      if (this.clouds()) {
        const cloudImgs = gsap.utils.toArray<Element>(this.clouds().nativeElement.querySelectorAll('img'));
        cloudImgs.forEach(cloudImg => {
          gsap.set(cloudImg, {
            y: 0,
            left: gsap.utils.random(-150, 0),
            // transformOrigin: "top center",
            // x: gsap.utils.random(-50, 0),
            // opacity: gsap.utils.random(0.3, 0.6),
            // scaleY: gsap.utils.random(0.8, 1)
            scale: gsap.utils.random(1, 1.2)
          });

          gsap.to(cloudImg, {
            x: gsap.utils.random(-20, 1),
            duration: gsap.utils.random(1, 2), // Slow, variable durations
            // opacity: gsap.utils.random(0.7, 1),
            // scaleY: gsap.utils.random(1, 1.1), // Stretch downward slightly
            skewX: gsap.utils.random(-1, 1), // Very subtle sway
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
            delay: gsap.utils.random(1, 2)
          });
        });
        const animation = gsap.to(this.clouds().nativeElement, {
          color: 'red',
          scale: 1.5,
          xPercent: -50,
          ease: "none",
          duration: 20,
          repeat: -1
        });
        this.destroyRef.onDestroy(() => {
          animation.kill();
        });
      }
    });
  }
}
