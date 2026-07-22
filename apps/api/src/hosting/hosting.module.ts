import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../auth/auth.module';
import { OrgRoleGuard } from '../auth/guards/org-role.guard';
import { CloudflarePagesClient } from './cloudflare-pages.client';
import { HostingController, HostingOauthController } from './hosting.controller';
import { HostingGithubService } from './hosting-github.service';
import { HostingService } from './hosting.service';

@Module({
  imports: [AuthModule, JwtModule.register({})],
  controllers: [HostingController, HostingOauthController],
  providers: [
    HostingService,
    HostingGithubService,
    CloudflarePagesClient,
    OrgRoleGuard,
  ],
  exports: [HostingService],
})
export class HostingModule {}
