import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./mychart/mychart').then(m => m.MyChart)
  }
];
