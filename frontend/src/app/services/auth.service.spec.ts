import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('inicia sin sesión cuando no hay token almacenado', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
  });

  it('guarda el token y el usuario al iniciar sesión', () => {
    service.login('admin@pricewatch.local', 'secret123').subscribe();

    const request = httpMock.expectOne('/api/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      email: 'admin@pricewatch.local',
      password: 'secret123',
    });

    request.flush({
      accessToken: 'jwt-token',
      tokenType: 'Bearer',
      expiresIn: '1h',
      user: {
        id: 'user-1',
        email: 'admin@pricewatch.local',
        role: 'ADMIN',
      },
    });

    expect(service.isAuthenticated()).toBe(true);
    expect(service.isAdmin()).toBe(true);
    expect(service.getToken()).toBe('jwt-token');
    expect(localStorage.getItem('pricewatch.access_token')).toBe('jwt-token');
  });

  it('elimina la sesión local al cerrar sesión', () => {
    service.login('admin@pricewatch.local', 'secret123').subscribe();
    httpMock.expectOne('/api/auth/login').flush({
      accessToken: 'jwt-token',
      tokenType: 'Bearer',
      expiresIn: '1h',
      user: {
        id: 'user-1',
        email: 'admin@pricewatch.local',
        role: 'ADMIN',
      },
    });

    service.logoutLocal();

    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
    expect(localStorage.getItem('pricewatch.access_token')).toBeNull();
  });
});
