import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthUser, LoginResponse } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'pricewatch.access_token';
  private readonly userKey = 'pricewatch.user';

  private readonly tokenSignal = signal<string | null>(this.readToken());
  private readonly userSignal = signal<AuthUser | null>(this.readUser());

  readonly token = this.tokenSignal.asReadonly();
  readonly currentUser = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.tokenSignal()));
  readonly isAdmin = computed(() => this.userSignal()?.role === 'ADMIN');

  constructor(private readonly http: HttpClient) {}

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/auth/login', { email, password }).pipe(
      tap((response) => {
        this.persistSession(response.accessToken, response.user);
      }),
    );
  }

  me(): Observable<AuthUser> {
    return this.http.get<AuthUser>('/api/auth/me').pipe(
      tap((user) => {
        this.persistUser(user);
      }),
    );
  }

  logout(): void {
    const token = this.getToken();
    if (token) {
      this.http
        .post('/api/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } })
        .subscribe({ error: () => undefined });
    }
    this.logoutLocal();
  }

  logoutLocal(): void {
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    this.removeStoredItem(this.tokenKey);
    this.removeStoredItem(this.userKey);
  }

  getToken(): string | null {
    return this.tokenSignal();
  }

  hasRole(role: AuthUser['role']): boolean {
    return this.userSignal()?.role === role;
  }

  private persistSession(token: string, user: AuthUser): void {
    this.tokenSignal.set(token);
    this.persistUser(user);
    this.storeItem(this.tokenKey, token);
  }

  private persistUser(user: AuthUser): void {
    this.userSignal.set(user);
    this.storeItem(this.userKey, JSON.stringify(user));
  }

  private readToken(): string | null {
    return this.readStoredItem(this.tokenKey);
  }

  private readUser(): AuthUser | null {
    const raw = this.readStoredItem(this.userKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      this.removeStoredItem(this.userKey);
      return null;
    }
  }

  private readStoredItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private storeItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // El almacenamiento puede estar bloqueado; la sesión seguirá en memoria.
    }
  }

  private removeStoredItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignorar bloqueos de almacenamiento.
    }
  }
}
