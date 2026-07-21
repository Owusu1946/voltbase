import { Module } from '@nestjs/common';
import { OrgsService } from './orgs.service';
import { OrgsController } from './orgs.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [OrgsService],
  controllers: [OrgsController],
  exports: [OrgsService],
})
export class OrgsModule {}
