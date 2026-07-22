import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TableEditorService } from './table-editor.service';
import { CreateTableDto } from './dto/create-table.dto';
import { AddColumnDto } from './dto/alter-table.dto';
import {
  CreateIndexDto,
  CreateUniqueConstraintDto,
  CreateForeignKeyDto,
  CreatePolicyDto,
  SetRlsDto,
} from './dto/constraints.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrgRoleGuard } from '../auth/guards/org-role.guard';

@Controller('orgs/:slug/projects/:projectSlug/tables')
@UseGuards(JwtAuthGuard, OrgRoleGuard)
export class TableEditorController {
  constructor(private tableEditorService: TableEditorService) {}

  @Get()
  getTables(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
  ) {
    return this.tableEditorService.getTables(slug, projectSlug);
  }

  @Get(':tableName/rows')
  getTableRows(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('tableName') tableName: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.tableEditorService.getTableRows(
      slug,
      projectSlug,
      tableName,
      limit ? parseInt(limit, 10) : 100,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get(':tableName')
  getTableInfo(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('tableName') tableName: string,
  ) {
    return this.tableEditorService.getTableInfo(slug, projectSlug, tableName);
  }

  @Post()
  createTable(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Body() dto: CreateTableDto,
  ) {
    return this.tableEditorService.createTable(slug, projectSlug, dto);
  }

  @Patch(':tableName/columns')
  addColumn(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('tableName') tableName: string,
    @Body() dto: AddColumnDto,
  ) {
    return this.tableEditorService.addColumn(slug, projectSlug, tableName, dto);
  }

  @Delete(':tableName/columns/:columnName')
  dropColumn(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('tableName') tableName: string,
    @Param('columnName') columnName: string,
  ) {
    return this.tableEditorService.dropColumn(
      slug,
      projectSlug,
      tableName,
      columnName,
    );
  }

  @Post(':tableName/indexes')
  createIndex(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('tableName') tableName: string,
    @Body() dto: CreateIndexDto,
  ) {
    return this.tableEditorService.createIndex(
      slug,
      projectSlug,
      tableName,
      dto,
    );
  }

  @Delete(':tableName/indexes/:indexName')
  dropIndex(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('indexName') indexName: string,
  ) {
    return this.tableEditorService.dropIndex(slug, projectSlug, indexName);
  }

  @Post(':tableName/constraints/unique')
  createUnique(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('tableName') tableName: string,
    @Body() dto: CreateUniqueConstraintDto,
  ) {
    return this.tableEditorService.createUniqueConstraint(
      slug,
      projectSlug,
      tableName,
      dto,
    );
  }

  @Delete(':tableName/constraints/:constraintName')
  dropConstraint(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('tableName') tableName: string,
    @Param('constraintName') constraintName: string,
  ) {
    return this.tableEditorService.dropConstraint(
      slug,
      projectSlug,
      tableName,
      constraintName,
    );
  }

  @Post(':tableName/foreign-keys')
  createForeignKey(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('tableName') tableName: string,
    @Body() dto: CreateForeignKeyDto,
  ) {
    return this.tableEditorService.createForeignKey(
      slug,
      projectSlug,
      tableName,
      dto,
    );
  }

  @Delete(':tableName/foreign-keys/:constraintName')
  dropForeignKey(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('tableName') tableName: string,
    @Param('constraintName') constraintName: string,
  ) {
    return this.tableEditorService.dropConstraint(
      slug,
      projectSlug,
      tableName,
      constraintName,
    );
  }

  @Post(':tableName/rls')
  setRls(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('tableName') tableName: string,
    @Body() dto: SetRlsDto,
  ) {
    return this.tableEditorService.setRls(slug, projectSlug, tableName, dto);
  }

  @Post(':tableName/policies')
  createPolicy(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('tableName') tableName: string,
    @Body() dto: CreatePolicyDto,
  ) {
    return this.tableEditorService.createPolicy(
      slug,
      projectSlug,
      tableName,
      dto,
    );
  }

  @Delete(':tableName/policies/:policyName')
  dropPolicy(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('tableName') tableName: string,
    @Param('policyName') policyName: string,
  ) {
    return this.tableEditorService.dropPolicy(
      slug,
      projectSlug,
      tableName,
      policyName,
    );
  }

  @Delete(':tableName')
  deleteTable(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('tableName') tableName: string,
  ) {
    return this.tableEditorService.deleteTable(slug, projectSlug, tableName);
  }

  @Patch(':tableName/rows/:pkValue')
  updateRow(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('tableName') tableName: string,
    @Param('pkValue') pkValue: string,
    @Body() body: { pkColumn: string; updates: Record<string, unknown> },
  ) {
    return this.tableEditorService.updateRow(
      slug,
      projectSlug,
      tableName,
      body.pkColumn,
      pkValue,
      body.updates,
    );
  }

  @Post(':tableName/rows')
  insertRow(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('tableName') tableName: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.tableEditorService.insertRow(slug, projectSlug, tableName, body);
  }

  @Delete(':tableName/rows/:pkValue')
  deleteRow(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('tableName') tableName: string,
    @Param('pkValue') pkValue: string,
    @Body() body: { pkColumn: string },
  ) {
    return this.tableEditorService.deleteRow(
      slug,
      projectSlug,
      tableName,
      body.pkColumn,
      pkValue,
    );
  }
}
