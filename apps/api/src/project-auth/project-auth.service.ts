import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { eq, sql } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { projects } from '../db/schema';
import {
  AUTH_PROVIDERS,
  AUTH_TOKEN_TYPES,
  EMAIL_VERIFY_EXPIRES_MS,
  MAGIC_LINK_EXPIRES_IN,
  PASSWORD_RESET_EXPIRES_MS,
} from '@voltbase/constants';
import type { SignUpInput, SignInInput } from '@voltbase/types';

interface ProjectAuthTokenPayload {
  sub: string;
  email: string;
  projectId: string;
}

@Injectable()
export class ProjectAuthService {
  private resend: Resend;

  constructor(
    private drizzle: DrizzleService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
  }

  private async getProject(projectSlug: string) {
    const [project] = await this.drizzle.db
      .select()
      .from(projects)
      .where(eq(projects.slug, projectSlug))
      .limit(1);

    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  // not every project needs Auth
  private async ensureAuthUsersTable(dbSchema: string): Promise<void> {
    await this.drizzle.db.execute(
      sql.raw(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}"."auth_users" (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT,
        email_verified BOOLEAN NOT NULL DEFAULT FALSE,
        provider TEXT NOT NULL DEFAULT 'email',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `),
    );

    await this.drizzle.db.execute(
      sql.raw(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}"."auth_tokens" (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES "${dbSchema}"."auth_users"(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ
      )
    `),
    );
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateRawToken(): string {
    return randomBytes(32).toString('hex');
  }

  private async createAuthToken(
    dbSchema: string,
    userId: string,
    type: string,
    expiresMs: number,
  ): Promise<string> {
    const rawToken = this.generateRawToken();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + expiresMs).toISOString();

    await this.drizzle.db.execute(sql`
      INSERT INTO ${sql.identifier(dbSchema)}.auth_tokens
        (user_id, type, token_hash, expires_at)
      VALUES (${userId}, ${type}, ${tokenHash}, ${expiresAt})
    `);

    return rawToken;
  }

  private async consumeAuthToken(
    dbSchema: string,
    rawToken: string,
    type: string,
  ): Promise<{ userId: string }> {
    const tokenHash = this.hashToken(rawToken);

    const result = await this.drizzle.db.execute<{
      id: string;
      user_id: string;
      expires_at: string;
      used_at: string | null;
    }>(sql`
      SELECT id, user_id, expires_at, used_at
      FROM ${sql.identifier(dbSchema)}.auth_tokens
      WHERE token_hash = ${tokenHash} AND type = ${type}
      LIMIT 1
    `);

    const row = result.rows[0];
    if (!row) throw new BadRequestException('Invalid or expired token');
    if (row.used_at) throw new BadRequestException('Token already used');
    if (new Date(row.expires_at).getTime() < Date.now()) {
      throw new BadRequestException('Invalid or expired token');
    }

    await this.drizzle.db.execute(sql`
      UPDATE ${sql.identifier(dbSchema)}.auth_tokens
      SET used_at = now()
      WHERE id = ${row.id}
    `);

    return { userId: row.user_id };
  }

  private signToken(
    userId: string,
    email: string,
    projectId: string,
    secret: string,
  ): string {
    return this.jwtService.sign(
      { sub: userId, email, projectId } satisfies ProjectAuthTokenPayload,
      { secret, expiresIn: '7d' },
    );
  }

  private async sendVerificationEmail(
    projectSlug: string,
    email: string,
    rawToken: string,
  ) {
    const apiUrl = this.configService.get<string>('API_URL');
    const verifyUrl = `${apiUrl}/projects/${projectSlug}/auth/verify-email?token=${rawToken}`;

    await this.resend.emails.send({
      from: 'Voltbase <onboarding@resend.dev>',
      to: email,
      subject: 'Verify your email',
      html: `
        <p>Click to verify your email:</p>
        <a href="${verifyUrl}">Verify email</a>
        <p style="color:#999;font-size:13px;">This link expires in 24 hours.</p>
      `,
    });
  }

  private async sendPasswordResetEmail(
    project: typeof projects.$inferSelect,
    email: string,
    rawToken: string,
  ) {
    const siteUrl = this.resolveSiteUrl(project);
    const resetUrl = `${siteUrl}/?type=recovery&token=${rawToken}`;

    await this.resend.emails.send({
      from: 'Voltbase <onboarding@resend.dev>',
      to: email,
      subject: 'Reset your password',
      html: `
        <p>Click to reset your password:</p>
        <a href="${resetUrl}">Reset password</a>
        <p style="color:#999;font-size:13px;">This link expires in 1 hour.</p>
      `,
    });
  }

  async signUp(projectSlug: string, dto: SignUpInput) {
    const project = await this.getProject(projectSlug);
    await this.ensureAuthUsersTable(project.dbSchema);

    const existing = await this.drizzle.db.execute<{ id: string }>(sql`
      SELECT id FROM ${sql.identifier(project.dbSchema)}.auth_users
      WHERE email = ${dto.email}
    `);

    if (existing.rows.length > 0) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const result = await this.drizzle.db.execute<{
      id: string;
      email: string;
    }>(sql`
      INSERT INTO ${sql.identifier(project.dbSchema)}.auth_users
        (email, password_hash, provider)
      VALUES (${dto.email}, ${passwordHash}, ${AUTH_PROVIDERS.EMAIL})
      RETURNING id, email
    `);

    const user = result.rows[0];

    const verifyToken = await this.createAuthToken(
      project.dbSchema,
      user.id,
      AUTH_TOKEN_TYPES.EMAIL_VERIFY,
      EMAIL_VERIFY_EXPIRES_MS,
    );
    await this.sendVerificationEmail(projectSlug, user.email, verifyToken);

    const accessToken = this.signToken(
      user.id,
      user.email,
      project.id,
      project.authJwtSecret,
    );

    return { user: { id: user.id, email: user.email }, accessToken };
  }

  async signIn(projectSlug: string, dto: SignInInput) {
    const project = await this.getProject(projectSlug);
    await this.ensureAuthUsersTable(project.dbSchema);

    const result = await this.drizzle.db.execute<{
      id: string;
      email: string;
      password_hash: string | null;
    }>(sql`
      SELECT id, email, password_hash
      FROM ${sql.identifier(project.dbSchema)}.auth_users
      WHERE email = ${dto.email}
    `);

    const user = result.rows[0];

    if (!user?.password_hash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const match = await bcrypt.compare(dto.password, user.password_hash);
    if (!match) throw new UnauthorizedException('Invalid credentials');

    // Soft verify: allow sign-in even when email_verified is false
    const accessToken = this.signToken(
      user.id,
      user.email,
      project.id,
      project.authJwtSecret,
    );

    return { user: { id: user.id, email: user.email }, accessToken };
  }

  async verifyEmail(projectSlug: string, token: string) {
    const project = await this.getProject(projectSlug);
    await this.ensureAuthUsersTable(project.dbSchema);

    const { userId } = await this.consumeAuthToken(
      project.dbSchema,
      token,
      AUTH_TOKEN_TYPES.EMAIL_VERIFY,
    );

    await this.drizzle.db.execute(sql`
      UPDATE ${sql.identifier(project.dbSchema)}.auth_users
      SET email_verified = true
      WHERE id = ${userId}
    `);

    return { siteUrl: this.resolveSiteUrl(project) };
  }

  async resendVerification(projectSlug: string, email: string) {
    const project = await this.getProject(projectSlug);
    await this.ensureAuthUsersTable(project.dbSchema);

    const result = await this.drizzle.db.execute<{
      id: string;
      email: string;
      email_verified: boolean;
    }>(sql`
      SELECT id, email, email_verified
      FROM ${sql.identifier(project.dbSchema)}.auth_users
      WHERE email = ${email}
    `);

    const user = result.rows[0];
    if (!user) {
      return { message: 'If that email is registered, a verification link was sent' };
    }

    if (user.email_verified) {
      return { message: 'Email already verified' };
    }

    const verifyToken = await this.createAuthToken(
      project.dbSchema,
      user.id,
      AUTH_TOKEN_TYPES.EMAIL_VERIFY,
      EMAIL_VERIFY_EXPIRES_MS,
    );
    await this.sendVerificationEmail(projectSlug, user.email, verifyToken);

    return { message: 'Verification email sent' };
  }

  async forgotPassword(projectSlug: string, email: string) {
    const project = await this.getProject(projectSlug);
    await this.ensureAuthUsersTable(project.dbSchema);

    const result = await this.drizzle.db.execute<{
      id: string;
      email: string;
    }>(sql`
      SELECT id, email
      FROM ${sql.identifier(project.dbSchema)}.auth_users
      WHERE email = ${email}
    `);

    const user = result.rows[0];
    if (user) {
      const resetToken = await this.createAuthToken(
        project.dbSchema,
        user.id,
        AUTH_TOKEN_TYPES.PASSWORD_RESET,
        PASSWORD_RESET_EXPIRES_MS,
      );
      await this.sendPasswordResetEmail(project, user.email, resetToken);
    }

    return { message: 'If that email is registered, a reset link was sent' };
  }

  async resetPassword(
    projectSlug: string,
    token: string,
    password: string,
  ) {
    const project = await this.getProject(projectSlug);
    await this.ensureAuthUsersTable(project.dbSchema);

    const { userId } = await this.consumeAuthToken(
      project.dbSchema,
      token,
      AUTH_TOKEN_TYPES.PASSWORD_RESET,
    );

    const passwordHash = await bcrypt.hash(password, 12);

    await this.drizzle.db.execute(sql`
      UPDATE ${sql.identifier(project.dbSchema)}.auth_users
      SET password_hash = ${passwordHash}, email_verified = true
      WHERE id = ${userId}
    `);

    return { message: 'Password updated' };
  }

  async sendMagicLink(projectSlug: string, email: string) {
    const project = await this.getProject(projectSlug);
    await this.ensureAuthUsersTable(project.dbSchema);

    const existing = await this.drizzle.db.execute<{ id: string }>(sql`
      SELECT id FROM ${sql.identifier(project.dbSchema)}.auth_users
      WHERE email = ${email}
    `);

    if (existing.rows.length === 0) {
      await this.drizzle.db.execute(sql`
        INSERT INTO ${sql.identifier(project.dbSchema)}.auth_users
          (email, provider, email_verified)
        VALUES (${email}, ${AUTH_PROVIDERS.EMAIL}, true)
      `);
    }

    const linkToken = this.jwtService.sign(
      { email, projectId: project.id },
      { secret: project.authJwtSecret, expiresIn: MAGIC_LINK_EXPIRES_IN },
    );

    const apiUrl = this.configService.get<string>('API_URL');
    const magicLinkUrl = `${apiUrl}/projects/${projectSlug}/auth/magic-link/verify?token=${linkToken}`;

    await this.resend.emails.send({
      from: 'Voltbase <onboarding@resend.dev>',
      to: email,
      subject: 'Your magic link',
      html: `
        <p>Click to sign in (expires in 15 minutes):</p>
        <a href="${magicLinkUrl}">Sign in</a>
      `,
    });

    return { message: 'Magic link sent' };
  }

  async verifyMagicLink(projectSlug: string, token: string) {
    const project = await this.getProject(projectSlug);

    let payload: { email: string; projectId: string };
    try {
      payload = this.jwtService.verify(token, {
        secret: project.authJwtSecret,
      });
    } catch {
      throw new BadRequestException('Invalid or expired magic link');
    }

    const result = await this.drizzle.db.execute<{ id: string; email: string }>(
      sql`
        SELECT id, email FROM ${sql.identifier(project.dbSchema)}.auth_users
        WHERE email = ${payload.email}
      `,
    );

    const user = result.rows[0];
    if (!user) throw new NotFoundException('User not found');

    const accessToken = this.signToken(
      user.id,
      user.email,
      project.id,
      project.authJwtSecret,
    );

    return { user: { id: user.id, email: user.email }, accessToken };
  }

  buildGoogleAuthUrl(clientId: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  buildGithubAuthUrl(clientId: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'user:email',
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async handleGoogleCallback(projectSlug: string, code: string) {
    const project = await this.getProject(projectSlug);
    await this.ensureAuthUsersTable(project.dbSchema);

    if (!project.googleClientId || !project.googleClientSecret) {
      throw new BadRequestException(
        'Google OAuth not configured for this project',
      );
    }

    const apiUrl = this.configService.get<string>('API_URL');
    const redirectUri = `${apiUrl}/projects/${projectSlug}/auth/google/callback`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: project.googleClientId,
        client_secret: project.googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = (await tokenRes.json()) as { access_token: string };

    const profileRes = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
    );

    const profile = (await profileRes.json()) as { email: string };
    return this.findOrCreateOAuthUser(
      project,
      profile.email,
      AUTH_PROVIDERS.GOOGLE,
    );
  }

  async handleGithubCallback(projectSlug: string, code: string) {
    const project = await this.getProject(projectSlug);
    await this.ensureAuthUsersTable(project.dbSchema);

    if (!project.githubClientId || !project.githubClientSecret) {
      throw new BadRequestException(
        'GitHub OAuth not configured for this project',
      );
    }

    const apiUrl = this.configService.get<string>('API_URL');
    const redirectUri = `${apiUrl}/projects/${projectSlug}/auth/github/callback`;

    const tokenRes = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: project.githubClientId,
          client_secret: project.githubClientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      },
    );

    const tokenData = (await tokenRes.json()) as { access_token: string };

    const profileRes = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github+json',
      },
    });

    const emails = (await profileRes.json()) as Array<{
      email: string;
      primary: boolean;
    }>;

    const primary = emails.find((e) => e.primary) ?? emails[0];
    if (!primary?.email) {
      throw new BadRequestException('Could not read email from GitHub');
    }

    return this.findOrCreateOAuthUser(
      project,
      primary.email,
      AUTH_PROVIDERS.GITHUB,
    );
  }

  private async findOrCreateOAuthUser(
    project: typeof projects.$inferSelect,
    email: string,
    provider: string,
  ) {
    const existing = await this.drizzle.db.execute<{
      id: string;
      email: string;
    }>(
      sql`
        SELECT id, email FROM ${sql.identifier(project.dbSchema)}.auth_users
        WHERE email = ${email}
      `,
    );

    let user = existing.rows[0];

    if (!user) {
      const result = await this.drizzle.db.execute<{
        id: string;
        email: string;
      }>(
        sql`
          INSERT INTO ${sql.identifier(project.dbSchema)}.auth_users
            (email, provider, email_verified)
          VALUES (${email}, ${provider}, true)
          RETURNING id, email
        `,
      );
      user = result.rows[0];
    }

    const accessToken = this.signToken(
      user.id,
      user.email,
      project.id,
      project.authJwtSecret,
    );

    return { user: { id: user.id, email: user.email }, accessToken };
  }

  async getUsers(projectSlug: string) {
    const project = await this.getProject(projectSlug);
    await this.ensureAuthUsersTable(project.dbSchema);

    const result = await this.drizzle.db.execute<{
      id: string;
      email: string;
      email_verified: boolean;
      provider: string;
      created_at: string;
    }>(sql`
      SELECT id, email, email_verified, provider, created_at
      FROM ${sql.identifier(project.dbSchema)}.auth_users
      ORDER BY created_at DESC
    `);

    return result.rows.map((row) => ({
      id: row.id,
      email: row.email,
      emailVerified: row.email_verified,
      provider: row.provider,
      createdAt: row.created_at,
    }));
  }

  async getOAuthSettings(projectSlug: string) {
    const project = await this.getProject(projectSlug);
    return {
      siteUrl: project.siteUrl,
      googleClientId: project.googleClientId,
      googleClientSecret: project.googleClientSecret,
      githubClientId: project.githubClientId,
      githubClientSecret: project.githubClientSecret,
    };
  }

  resolveSiteUrl(project: typeof projects.$inferSelect): string {
    return (
      project.siteUrl ??
      this.configService.get<string>('WEB_URL') ??
      'http://localhost:3001'
    );
  }

  async getSiteUrlForProject(projectSlug: string): Promise<string> {
    const project = await this.getProject(projectSlug);
    return this.resolveSiteUrl(project);
  }

  async updateOAuthSettings(
    projectSlug: string,
    settings: {
      siteUrl?: string;
      googleClientId?: string;
      googleClientSecret?: string;
      githubClientId?: string;
      githubClientSecret?: string;
    },
  ) {
    const project = await this.getProject(projectSlug);

    const [updated] = await this.drizzle.db
      .update(projects)
      .set(settings)
      .where(eq(projects.id, project.id))
      .returning();

    return updated;
  }
}
