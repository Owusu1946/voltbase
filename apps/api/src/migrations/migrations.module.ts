import { Module } from '@nestjs/common';
import { MigrationsService } from './migrations.service';
import { MigrationsController } from './migrations.controller';
import { AuthModule } from '../auth/auth.module';
import { OrgRoleGuard } from '../auth/guards/org-role.guard';

@Module({
  imports: [AuthModule],
  providers: [MigrationsService, OrgRoleGuard],
  controllers: [MigrationsController],
})
export class MigrationsModule {}
