import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { RealtimeController } from './realtime.controller';
import { TriggerService } from './trigger.service';
import { AuthModule } from '../auth/auth.module';
import { OrgRoleGuard } from '../auth/guards/org-role.guard';

@Module({
  imports: [AuthModule],
  providers: [RealtimeGateway, RealtimeService, TriggerService, OrgRoleGuard],
  controllers: [RealtimeController],
})
export class RealtimeModule {}
