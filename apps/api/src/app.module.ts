import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from './db/db.module';
import { AuthModule } from './auth/auth.module';
import { OrgsModule } from './orgs/orgs.module';
import { MembersModule } from './members/members.module';
import { ProjectsModule } from './projects/projects.module';
import { TableEditorModule } from './table-editor/table-editor.module';
import { ProjectApiModule } from './project-api/project-api.module';
import { SqlEditorModule } from './sql-editor/sql-editor.module';
import { MigrationsModule } from './migrations/migrations.module';
import { RealtimeModule } from './realtime/realtime.module';
import { StorageModule } from './storage/storage.module';
import { ProjectAuthModule } from './project-auth/project-auth.module';
import { ExtensionsModule } from './extensions/extensions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DbModule,
    AuthModule,
    OrgsModule,
    MembersModule,
    ProjectsModule,
    TableEditorModule,
    ProjectApiModule,
    SqlEditorModule,
    MigrationsModule,
    RealtimeModule,
    StorageModule,
    ProjectAuthModule,
    ExtensionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
