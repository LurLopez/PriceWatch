import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { CatalogComponent } from './pages/catalog/catalog.component';
import { EvaluatorComponent } from './pages/evaluator/evaluator.component';
import { HistoryComponent } from './pages/history/history.component';
import { LoginComponent } from './pages/login/login.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, title: 'PriceWatch - Iniciar sesión' },
  {
    path: 'evaluator',
    component: EvaluatorComponent,
    canActivate: [authGuard],
    title: 'PriceWatch - Evaluador',
  },
  { path: 'catalog', component: CatalogComponent, title: 'PriceWatch - Catálogo' },
  {
    path: 'history',
    component: HistoryComponent,
    canActivate: [authGuard],
    title: 'PriceWatch - Historial',
  },
  { path: '', redirectTo: 'evaluator', pathMatch: 'full' },
  { path: '**', redirectTo: 'evaluator' },
];
