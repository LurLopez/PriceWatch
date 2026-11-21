import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { IonButton, IonHeader, IonToolbar } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { PwaService } from '../../services/pwa.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IonButton, IonHeader, IonToolbar],
  template: `
    <ion-header class="app-header">
      <ion-toolbar>
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
            @if (pwaService.updateAvailable()) {
              <ion-button size="small" color="success" (click)="pwaService.reload()">
                Actualizar
              </ion-button>
            }
            @if (pwaService.installPromptVisible()) {
              <ion-button size="small" color="success" (click)="pwaService.install()">
                Instalar app
              </ion-button>
            }
            @if (authService.isAuthenticated()) {
              <span class="user-chip" [title]="authService.currentUser()?.email || ''">
                {{ authService.currentUser()?.email }}
                <b>{{ authService.currentUser()?.role }}</b>
              </span>
              <ion-button size="small" fill="outline" (click)="logout()" aria-label="Cerrar sesión">
                Salir
              </ion-button>
            } @else {
              <ion-button size="small" fill="outline" routerLink="/login">
                Iniciar sesión
              </ion-button>
            }
          </div>
        </div>
      </ion-toolbar>
    </ion-header>
  `,
  styles: [
    `
      .app-header {
        background: #ffffff;
      }

      ion-toolbar {
        --background: #ffffff;
        --border-color: #e2e8f0;
        --min-height: 58px;
        padding: 0.15rem 1rem;
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
        gap: 0.4rem;
        flex-wrap: wrap;
      }

      .user-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        max-width: 220px;
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

      @media (max-width: 640px) {
        ion-toolbar {
          padding: 0.35rem 0.5rem;
        }

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
          max-width: 140px;
        }
      }
    `,
  ],
})
export class NavbarComponent {
  readonly authService = inject(AuthService);
  readonly pwaService = inject(PwaService);
  private readonly router = inject(Router);

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
