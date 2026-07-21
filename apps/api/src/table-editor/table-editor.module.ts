import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgRoleGuard } from '../auth/guards/org-role.guard';
import { TableEditorService } from './table-editor.service';
import { TableEditorController } from './table-editor.controller';

@Module({
  imports: [AuthModule],
  providers: [TableEditorService, OrgRoleGuard],
  controllers: [TableEditorController],
})
export class TableEditorModule {}
