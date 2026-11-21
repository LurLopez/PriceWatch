import { TestBed } from '@angular/core/testing';
import { provideRouter, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  function runGuard(isAuthenticated: boolean): ReturnType<typeof authGuard> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { isAuthenticated: () => isAuthenticated },
        },
      ],
    });

    return TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/evaluator' } as never),
    );
  }

  it('permite el acceso cuando hay una sesión activa', () => {
    expect(runGuard(true)).toBe(true);
  });

  it('redirige al login cuando no hay sesión', () => {
    const result = runGuard(false) as UrlTree;
    expect(result instanceof UrlTree).toBe(true);
    expect(result.toString()).toContain('/login');
  });
});
