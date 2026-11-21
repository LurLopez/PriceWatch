import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="login-container">
      <div class="card login-card">
        <div class="login-heading">
          <span class="eyebrow">Acceso seguro</span>
          <h2>Iniciar sesión</h2>
          <p>
            Ingrese con su cuenta para evaluar productos y consultar su historial. La sesión usa un
            token JWT con expiración.
          </p>
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" novalidate>
          <div class="form-field">
            <label for="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              autocomplete="username"
              inputmode="email"
              placeholder="usuario@pricewatch.local"
              [attr.aria-invalid]="emailInvalid"
              aria-describedby="email-error"
            />
            @if (emailInvalid) {
              <small id="email-error" class="field-error" role="alert">
                Ingrese un correo electrónico válido.
              </small>
            }
          </div>

          <div class="form-field">
            <label for="password">Contraseña</label>
            <input
              id="password"
              type="password"
              formControlName="password"
              autocomplete="current-password"
              placeholder="••••••••"
              [attr.aria-invalid]="passwordInvalid"
              aria-describedby="password-error"
            />
            @if (passwordInvalid) {
              <small id="password-error" class="field-error" role="alert">
                La contraseña es obligatoria.
              </small>
            }
          </div>

          @if (errorMessage) {
            <p class="form-error" role="alert" aria-live="assertive">
              {{ errorMessage }}
            </p>
          }

          <button class="btn login-button" type="submit" [disabled]="loading">
            {{ loading ? 'Ingresando…' : 'Ingresar' }}
          </button>
        </form>

        <p class="login-help">
          Las credenciales de demostración se configuran en las variables
          <code>ADMIN_*</code> y <code>DEMO_USER_*</code> del archivo <code>.env</code>.
        </p>

        <p class="login-footer">
          <a routerLink="/catalog">Continuar al catálogo público</a>
        </p>
      </div>
    </section>
  `,
  styles: [
    `
      .login-container {
        display: flex;
        justify-content: center;
        padding: 2rem 0;
      }

      .login-card {
        width: 100%;
        max-width: 420px;
        padding: 1.75rem;
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
        gap: 0.9rem;
      }

      .form-field {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
      }

      label {
        font-size: 0.85rem;
        font-weight: 600;
        color: #1e293b;
      }

      input {
        width: 100%;
        padding: 0.6rem 0.75rem;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        font-size: 0.95rem;
        background: #ffffff;
      }

      input[aria-invalid='true'] {
        border-color: #dc2626;
      }

      .field-error,
      .form-error {
        color: #b91c1c;
        font-size: 0.8rem;
      }

      .form-error {
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 6px;
        padding: 0.5rem 0.65rem;
      }

      .login-button {
        width: 100%;
        margin-top: 0.35rem;
        padding: 0.65rem 1rem;
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
