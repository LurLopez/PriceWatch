import { Routes } from '@angular/router';
import { EvaluatorComponent } from './pages/evaluator/evaluator.component';
import { CatalogComponent } from './pages/catalog/catalog.component';
import { HistoryComponent } from './pages/history/history.component';

export const routes: Routes = [
  { path: '', redirectTo: 'evaluator', pathMatch: 'full' },
  { path: 'evaluator', component: EvaluatorComponent, title: 'PriceWatch - Evaluador' },
  { path: 'catalog', component: CatalogComponent, title: 'PriceWatch - Catálogo' },
  { path: 'history', component: HistoryComponent, title: 'PriceWatch - Historial' },
  { path: '**', redirectTo: 'evaluator' },
];
