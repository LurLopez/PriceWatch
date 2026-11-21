import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { provideIonicAngular } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let authService: { login: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authService = {
      login: vi.fn().mockReturnValue(
        of({
          accessToken: 'token',
          tokenType: 'Bearer',
          expiresIn: '1h',
          user: { id: '1', email: 'admin@pricewatch.local', role: 'ADMIN' },
        }),
      ),
    };

    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        provideIonicAngular(),
        { provide: AuthService, useValue: authService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: { get: () => null },
            },
          },
        },
      ],
    });
  });

  it('no envía el formulario si es inválido', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;

    component.onSubmit();

    expect(component.loginForm.invalid).toBe(true);
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('envía credenciales válidas y navega al evaluador', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    component.loginForm.setValue({
      email: 'admin@pricewatch.local',
      password: 'secret123',
    });
    component.onSubmit();

    expect(authService.login).toHaveBeenCalledWith('admin@pricewatch.local', 'secret123');
    expect(navigate).toHaveBeenCalledWith('/evaluator');
    expect(component.loading).toBe(false);
  });

  it('muestra un error controlado si las credenciales son inválidas', () => {
    authService.login.mockReturnValueOnce(throwError(() => ({ status: 401 })));
    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;
    component.loginForm.setValue({
      email: 'admin@pricewatch.local',
      password: 'incorrecta',
    });

    component.onSubmit();

    expect(component.errorMessage).toContain('Credenciales inválidas');
    expect(component.loading).toBe(false);
  });
});
