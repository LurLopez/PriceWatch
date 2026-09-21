import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="header">
      <div class="nav-container">
        <a routerLink="/evaluator" class="brand">PriceWatch</a>
        <nav class="links">
          <a routerLink="/evaluator" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Evaluador</a>
          <a routerLink="/catalog" routerLinkActive="active">Catálogo</a>
          <a routerLink="/history" routerLinkActive="active">Historial</a>
        </nav>
      </div>
    </header>
  `,
  styles: [`
    .header {
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      padding: 0.75rem 1rem;
    }
    .nav-container {
      max-width: 900px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f172a;
      text-decoration: none;
    }
    .links {
      display: flex;
      gap: 1rem;
    }
    .links a {
      text-decoration: none;
      color: #64748b;
      font-size: 0.9rem;
      font-weight: 500;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
    }
    .links a:hover {
      color: #0f172a;
    }
    .links a.active {
      color: #2563eb;
      background: #eff6ff;
    }
  `]
})
export class NavbarComponent {}
