import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrgRoleGuard } from '../auth/guards/org-role.guard';
import { ProjectsService } from '../projects/projects.service';

@Controller('orgs/:slug/projects/:projectSlug/extensions')
@UseGuards(JwtAuthGuard, OrgRoleGuard)
export class ExtensionsController {
  constructor(private projectsService: ProjectsService) {}

  @Get()
  async list() {
    const vector = await this.projectsService.getVectorExtensionStatus();
    return {
      extensions: [
        {
          name: 'vector',
          displayName: 'pgvector',
          description: 'Embeddings and vector similarity search',
          enabled: vector.enabled,
          version: vector.version,
        },
      ],
    };
  }

  @Post('vector/enable')
  async enableVector() {
    const vector = await this.projectsService.ensureVectorExtension();
    return {
      name: 'vector',
      displayName: 'pgvector',
      description: 'Embeddings and vector similarity search',
      enabled: vector.enabled,
      version: vector.version,
    };
  }
}
