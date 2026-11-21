import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="header">
      <div class="nav-container">
        <a routerLink="/evaluator" class="brand">PriceWatch</a>

        <nav class="links" aria-label="Navegación principal">
          @if (authService.isAuthenticated()) {
            <a
              routerLink="/evaluator"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: true }"
              >Evaluador</a
            >
          }
          <a routerLink="/catalog" routerLinkActive="active">Catálogo</a>
          @if (authService.isAuthenticated()) {
            <a routerLink="/history" routerLinkActive="active">Historial</a>
          }
        </nav>

        <div class="session">
          @if (authService.isAuthenticated()) {
            <span class="user-chip" [title]="authService.currentUser()?.email || ''">
              {{ authService.currentUser()?.email }}
              <b>{{ authService.currentUser()?.role }}</b>
            </span>
            <button
              type="button"
              class="logout-button"
              (click)="logout()"
              aria-label="Cerrar sesión"
            >
              Salir
            </button>
          } @else {
            <a routerLink="/login" class="login-link">Iniciar sesión</a>
          }
        </div>
      </div>
    </header>
  `,
  styles: [
    `
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
        gap: 0.75rem;
        flex-wrap: wrap;
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
      .session {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .user-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        max-width: 230px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 0.78rem;
        color: #475569;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 999px;
        padding: 0.25rem 0.55rem;
      }
      .user-chip b {
        color: #1d4ed8;
        font-size: 0.68rem;
        letter-spacing: 0.04em;
      }
      .logout-button,
      .login-link {
        font-size: 0.82rem;
        font-weight: 600;
        color: #2563eb;
        background: transparent;
        border: 1px solid #bfdbfe;
        border-radius: 5px;
        padding: 0.3rem 0.6rem;
        cursor: pointer;
        text-decoration: none;
      }
      .logout-button:hover,
      .login-link:hover {
        background: #eff6ff;
      }
      @media (max-width: 640px) {
        .nav-container {
          align-items: flex-start;
        }
        .links {
          order: 3;
          width: 100%;
          gap: 0.35rem;
        }
        .links a {
          padding: 0.2rem 0.35rem;
          font-size: 0.82rem;
        }
        .user-chip {
          max-width: 150px;
        }
      }
    `,
  ],
})
export class NavbarComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
