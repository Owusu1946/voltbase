import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgRoleGuard } from '../auth/guards/org-role.guard';
import { ProjectsModule } from '../projects/projects.module';
import { ExtensionsController } from './extensions.controller';

@Module({
  imports: [AuthModule, ProjectsModule],
  controllers: [ExtensionsController],
  providers: [OrgRoleGuard],
})
export class ExtensionsModule {}
