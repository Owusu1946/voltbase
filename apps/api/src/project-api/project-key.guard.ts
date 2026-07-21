import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { Request } from 'express';
import { PROJECT_KEY_ROLES } from '@voltbase/constants';
import { DrizzleService } from '../db/drizzle.service';
import { projects } from '../db/schema';

export interface ProjectKeyPayload {
  projectId: string;
  role: typeof PROJECT_KEY_ROLES.ANON | typeof PROJECT_KEY_ROLES.SERVICE_ROLE;
  v?: number;
}

@Injectable()
export class ProjectKeyGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private drizzle: DrizzleService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing API key');
    }

    const token = authHeader.slice(7);

    let payload: ProjectKeyPayload;
    try {
      payload = this.jwtService.verify<ProjectKeyPayload>(token, {
        secret: this.configService.get<string>('PROJECT_JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid API key');
    }

    const [project] = await this.drizzle.db
      .select({
        anonKey: projects.anonKey,
        serviceRoleKey: projects.serviceRoleKey,
        anonKeyVersion: projects.anonKeyVersion,
        serviceRoleKeyVersion: projects.serviceRoleKeyVersion,
      })
      .from(projects)
      .where(eq(projects.id, payload.projectId))
      .limit(1);

    if (!project) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (typeof payload.v === 'number') {
      const expectedVersion =
        payload.role === PROJECT_KEY_ROLES.SERVICE_ROLE
          ? project.serviceRoleKeyVersion
          : project.anonKeyVersion;

      if (payload.v !== expectedVersion) {
        throw new UnauthorizedException('API key has been rotated');
      }
    } else {
      const matchesStored =
        token === project.anonKey || token === project.serviceRoleKey;
      if (!matchesStored) {
        throw new UnauthorizedException('Invalid API key');
      }
    }

    request['projectKey'] = payload;
    return true;
  }
}
