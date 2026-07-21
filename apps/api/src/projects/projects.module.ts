import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { OrgRoleGuard } from '../auth/guards/org-role.guard';

@Module({
  imports: [JwtModule.register({})],
  providers: [ProjectsService, OrgRoleGuard],
  controllers: [ProjectsController],
  exports: [ProjectsService],
})
export class ProjectsModule {}
