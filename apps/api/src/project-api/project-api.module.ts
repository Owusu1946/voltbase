import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ProjectApiService } from './project-api.service';
import { ProjectApiController } from './project-api.controller';
import { ProjectKeyGuard } from './project-key.guard';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [JwtModule.register({}), ProjectsModule],
  providers: [ProjectApiService, ProjectKeyGuard],
  controllers: [ProjectApiController],
})
export class ProjectApiModule {}
