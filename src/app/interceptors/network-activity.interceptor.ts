import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { NetworkActivityService } from '../services/network-activity.service';

export const networkActivityInterceptor: HttpInterceptorFn = (req, next) => {
  const network = inject(NetworkActivityService);
  network.increment();

  return next(req).pipe(
    finalize(() => {
      network.decrement();
    })
  );
};
