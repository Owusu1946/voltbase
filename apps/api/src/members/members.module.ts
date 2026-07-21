import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MembersService } from './members.service';
import { InviteService } from './invite.service';
import { MembersController } from './members.controller';

@Module({
  imports: [JwtModule.register({})],
  providers: [MembersService, InviteService],
  controllers: [MembersController],
  exports: [InviteService],
})
export class MembersModule {}
