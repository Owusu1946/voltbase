import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ProjectAuthService } from './project-auth.service';
import { ProjectAuthController } from './project-auth.controller';
import { ProjectAuthDashboardController } from './project-auth-dashboard.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [JwtModule.register({}), AuthModule],
  providers: [ProjectAuthService],
  controllers: [ProjectAuthController, ProjectAuthDashboardController],
})
export class ProjectAuthModule {}
