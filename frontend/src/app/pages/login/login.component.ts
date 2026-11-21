import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonButton, IonCard, IonCardContent, IonInput, IonNote, IonSpinner } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    IonButton,
    IonCard,
    IonCardContent,
    IonInput,
    IonNote,
    IonSpinner,
  ],
  template: `
    <section class="login-container">
      <ion-card class="login-card">
        <ion-card-content>
          <div class="login-heading">
            <span class="eyebrow">Acceso seguro</span>
            <h2>Iniciar sesión</h2>
            <p>
              Ingrese con su cuenta para evaluar productos y consultar su historial. La sesión usa
              un token JWT con expiración.
            </p>
          </div>

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" novalidate>
            <ion-input
              id="email"
              type="email"
              fill="outline"
              formControlName="email"
              label="Correo electrónico"
              labelPlacement="stacked"
              autocomplete="username"
              inputmode="email"
              placeholder="usuario@pricewatch.local"
              [attr.aria-invalid]="emailInvalid"
              aria-describedby="email-error"
            ></ion-input>
            @if (emailInvalid) {
              <ion-note color="danger" id="email-error" class="field-error" role="alert">
                Ingrese un correo electrónico válido.
              </ion-note>
            }

            <ion-input
              id="password"
              type="password"
              fill="outline"
              formControlName="password"
              label="Contraseña"
              labelPlacement="stacked"
              autocomplete="current-password"
              placeholder="••••••••"
              [attr.aria-invalid]="passwordInvalid"
              aria-describedby="password-error"
            ></ion-input>
            @if (passwordInvalid) {
              <ion-note color="danger" id="password-error" class="field-error" role="alert">
                La contraseña es obligatoria.
              </ion-note>
            }

            @if (errorMessage) {
              <ion-note color="danger" class="form-error" role="alert" aria-live="assertive">
                {{ errorMessage }}
              </ion-note>
            }

            <ion-button class="login-button" type="submit" expand="block" [disabled]="loading">
              @if (loading) {
                <ion-spinner name="crescent" slot="start"></ion-spinner>
              }
              {{ loading ? 'Ingresando…' : 'Ingresar' }}
            </ion-button>
          </form>

          <p class="login-help">
            Las credenciales de demostración se configuran en las variables
            <code>ADMIN_*</code> y <code>DEMO_USER_*</code> del archivo <code>.env</code>.
          </p>

          <p class="login-footer">
            <a routerLink="/catalog">Continuar al catálogo público</a>
          </p>
        </ion-card-content>
      </ion-card>
    </section>
  `,
  styles: [
    `
      .login-container {
        display: flex;
        justify-content: center;
        padding: 1.5rem 0;
      }

      .login-card {
        width: 100%;
        max-width: 440px;
        margin: 0;
      }

      .login-heading {
        margin-bottom: 1.25rem;
      }

      .eyebrow {
        display: inline-block;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #2563eb;
        margin-bottom: 0.35rem;
      }

      h2 {
        font-size: 1.45rem;
        margin-bottom: 0.4rem;
        color: #0f172a;
      }

      .login-heading p,
      .login-help,
      .login-footer {
        color: #64748b;
        font-size: 0.88rem;
      }

      form {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
      }

      ion-input {
        margin-bottom: 0.15rem;
        --color: #1e293b;
        --placeholder-color: #64748b;
        --label-color: #334155;
      }

      .field-error,
      .form-error {
        display: block;
        font-size: 0.8rem;
        margin: -0.2rem 0 0.35rem;
      }

      .form-error {
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 6px;
        padding: 0.5rem 0.65rem;
        margin: 0.35rem 0;
      }

      .login-button {
        margin-top: 0.5rem;
      }

      .login-help {
        margin-top: 1rem;
        border-top: 1px solid #f1f5f9;
        padding-top: 0.9rem;
      }

      .login-help code {
        background: #f1f5f9;
        border-radius: 3px;
        padding: 0.05rem 0.25rem;
      }

      .login-footer {
        margin-top: 0.75rem;
        text-align: center;
      }

      .login-footer a {
        color: #2563eb;
        text-decoration: none;
      }

      .login-footer a:hover {
        text-decoration: underline;
      }
    `,
  ],
})
export class LoginComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  loading = false;
  errorMessage = '';

  get emailInvalid(): boolean {
    const control = this.loginForm.controls.email;
    return control.invalid && (control.dirty || control.touched);
  }

  get passwordInvalid(): boolean {
    const control = this.loginForm.controls.password;
    return control.invalid && (control.dirty || control.touched);
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.loginForm.markAllAsTouched();

    if (this.loginForm.invalid) {
      return;
    }

    const { email, password } = this.loginForm.getRawValue();
    this.loading = true;

    this.authService.login(email, password).subscribe({
      next: () => {
        this.loading = false;
        void this.router.navigateByUrl(this.safeReturnUrl());
      },
      error: (error: { status?: number }) => {
        this.loading = false;
        this.errorMessage =
          error.status === 401
            ? 'Credenciales inválidas. Compruebe el correo y la contraseña.'
            : 'No se pudo iniciar sesión. Verifique la conexión con la API.';
      },
    });
  }

  private safeReturnUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
      return returnUrl;
    }
    return '/evaluator';
  }
}
