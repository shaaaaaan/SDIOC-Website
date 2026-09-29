import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NetworkActivityService {
  private activeRequestsCount = signal(0);
  readonly isLoading = signal(false);

  increment(): void {
    const next = this.activeRequestsCount() + 1;
    this.activeRequestsCount.set(next);
    if (next > 0) {
      this.isLoading.set(true);
    }
  }

  decrement(): void {
    const next = Math.max(0, this.activeRequestsCount() - 1);
    this.activeRequestsCount.set(next);
    if (next === 0) {
      this.isLoading.set(false);
    }
  }
}
