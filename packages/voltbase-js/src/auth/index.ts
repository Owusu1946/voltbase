interface AuthUser {
  id: string;
  email: string;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}

export interface AuthResult {
  data: { user: AuthUser; accessToken: string } | null;
  error: string | null;
}

export type AuthChangeEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'INITIAL_SESSION';

const STORAGE_KEY = 'voltbase.auth.token';

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function decodeUser(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as {
      sub: string;
      email: string;
    };
    return { id: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

export class VoltbaseAuth {
  private currentToken: string | null = null;
  private listeners = new Set<
    (event: AuthChangeEvent, session: AuthSession | null) => void
  >();

  constructor(private projectUrl: string) {
    this.hydrateFromStorage();
    this.hydrateFromUrl();
  }

  private hydrateFromStorage(): void {
    if (!canUseLocalStorage()) return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const user = decodeUser(stored);
    if (!user) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    this.currentToken = stored;
  }

  private hydrateFromUrl(): void {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    if (!accessToken) return;

    this.setSession({ accessToken });
    params.delete('access_token');
    const next = params.toString();
    const url = `${window.location.pathname}${next ? `?${next}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', url);
  }

  private persistToken(token: string | null): void {
    if (!canUseLocalStorage()) return;
    if (token) localStorage.setItem(STORAGE_KEY, token);
    else localStorage.removeItem(STORAGE_KEY);
  }

  private emit(event: AuthChangeEvent, session: AuthSession | null): void {
    for (const listener of this.listeners) {
      listener(event, session);
    }
  }

  setSession(session: { accessToken: string }): AuthSession | null {
    const user = decodeUser(session.accessToken);
    if (!user) return null;

    this.currentToken = session.accessToken;
    this.persistToken(session.accessToken);
    const next: AuthSession = { accessToken: session.accessToken, user };
    this.emit('SIGNED_IN', next);
    return next;
  }

  getSession(): AuthSession | null {
    if (!this.currentToken) return null;
    const user = decodeUser(this.currentToken);
    if (!user) return null;
    return { accessToken: this.currentToken, user };
  }

  onAuthStateChange(
    callback: (event: AuthChangeEvent, session: AuthSession | null) => void,
  ): () => void {
    this.listeners.add(callback);
    callback('INITIAL_SESSION', this.getSession());
    return () => {
      this.listeners.delete(callback);
    };
  }

  async signUp(credentials: {
    email: string;
    password: string;
  }): Promise<AuthResult> {
    try {
      const res = await fetch(`${this.projectUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        return { data: null, error: err.message ?? 'Sign up failed' };
      }

      const data = (await res.json()) as {
        user: AuthUser;
        accessToken: string;
      };
      this.setSession({ accessToken: data.accessToken });
      return { data, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error';
      return { data: null, error: message };
    }
  }

  async signIn(credentials: {
    email: string;
    password: string;
  }): Promise<AuthResult> {
    try {
      const res = await fetch(`${this.projectUrl}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        return { data: null, error: err.message ?? 'Sign in failed' };
      }

      const data = (await res.json()) as {
        user: AuthUser;
        accessToken: string;
      };
      this.setSession({ accessToken: data.accessToken });
      return { data, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error';
      return { data: null, error: message };
    }
  }

  async sendMagicLink(email: string): Promise<{ error: string | null }> {
    try {
      const res = await fetch(`${this.projectUrl}/auth/magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) return { error: 'Failed to send magic link' };
      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error';
      return { error: message };
    }
  }

  async resendVerification(email: string): Promise<{ error: string | null }> {
    try {
      const res = await fetch(`${this.projectUrl}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) return { error: 'Failed to resend verification email' };
      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error';
      return { error: message };
    }
  }

  async resetPasswordForEmail(
    email: string,
  ): Promise<{ error: string | null }> {
    try {
      const res = await fetch(`${this.projectUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) return { error: 'Failed to send password reset email' };
      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error';
      return { error: message };
    }
  }

  async updatePassword(credentials: {
    token: string;
    password: string;
  }): Promise<{ error: string | null }> {
    try {
      const res = await fetch(`${this.projectUrl}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        return { error: err.message ?? 'Failed to update password' };
      }
      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error';
      return { error: message };
    }
  }

  signInWithGoogle(): void {
    window.location.href = `${this.projectUrl}/auth/google`;
  }

  signInWithGithub(): void {
    window.location.href = `${this.projectUrl}/auth/github`;
  }

  signOut(): void {
    this.currentToken = null;
    this.persistToken(null);
    this.emit('SIGNED_OUT', null);
  }

  getUser(): AuthUser | null {
    return this.getSession()?.user ?? null;
  }

  getAccessToken(): string | null {
    return this.currentToken;
  }
}
