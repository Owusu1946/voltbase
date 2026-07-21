import { Module, forwardRef } from '@nestjs/common';
import { OrgsService } from './orgs.service';
import { OrgsController } from './orgs.controller';
import { AuthModule } from '../auth/auth.module';
import { ProjectsModule } from '../projects/projects.module';
import { OrgRoleGuard } from '../auth/guards/org-role.guard';

@Module({
  imports: [AuthModule, forwardRef(() => ProjectsModule)],
  providers: [OrgsService, OrgRoleGuard],
  controllers: [OrgsController],
  exports: [OrgsService],
})
export class OrgsModule {}
