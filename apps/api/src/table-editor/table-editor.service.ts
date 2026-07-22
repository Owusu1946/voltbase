import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { projects, organizations } from '../db/schema';
import { CreateTableDto } from './dto/create-table.dto';
import { AddColumnDto } from './dto/alter-table.dto';
import type {
  TableInfo,
  TableColumn,
  ColumnType,
  TableIndex,
  TableUniqueConstraint,
  TableForeignKey,
  TablePolicy,
} from '@voltbase/types';
import {
  CreateIndexDto,
  CreateUniqueConstraintDto,
  CreateForeignKeyDto,
  CreatePolicyDto,
  SetRlsDto,
} from './dto/constraints.dto';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class TableEditorService {
  constructor(
    private drizzle: DrizzleService,
    private projectsService: ProjectsService,
  ) {}

  private assertSafeIdentifier(name: string, label: string): void {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      throw new BadRequestException(`Invalid ${label}: ${name}`);
    }
  }

  //   Type mapping
  private mapPgTypeToColumnType(pgType: string): ColumnType {
    const map: Record<string, ColumnType> = {
      text: 'text',
      'character varying': 'text',
      integer: 'integer',
      bigint: 'bigint',
      boolean: 'boolean',
      'timestamp with time zone': 'timestamp',
      'timestamp without time zone': 'timestamp',
      uuid: 'uuid',
      jsonb: 'jsonb',
      numeric: 'numeric',
    };
    return map[pgType] ?? 'text';
  }

  private mapType(type: string): string {
    const map: Record<string, string> = {
      text: 'TEXT',
      integer: 'INTEGER',
      bigint: 'BIGINT',
      boolean: 'BOOLEAN',
      timestamp: 'TIMESTAMPTZ',
      uuid: 'UUID',
      jsonb: 'JSONB',
      numeric: 'NUMERIC',
    };
    return map[type] ?? 'TEXT';
  }

  private formatDefault(value: string, type: ColumnType): string {
    const trimmed = value.trim();
    if (!trimmed) return '';

    if (/^(now\(\)|gen_random_uuid\(\)|current_timestamp)$/i.test(trimmed)) {
      return trimmed;
    }
    if (type === 'boolean') return trimmed;
    if (type === 'integer' || type === 'bigint' || type === 'numeric') {
      return trimmed;
    }
    if (type === 'jsonb') return `'${trimmed.replace(/'/g, "''")}'::jsonb`;
    return `'${trimmed.replace(/'/g, "''")}'`;
  }

  private async getProjectSchema(
    orgSlug: string,
    projectSlug: string,
  ): Promise<string> {
    const [row] = await this.drizzle.db
      .select({ dbSchema: projects.dbSchema })
      .from(projects)
      .innerJoin(organizations, eq(projects.orgId, organizations.id))
      .where(
        and(eq(organizations.slug, orgSlug), eq(projects.slug, projectSlug)),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Project not found');
    return row.dbSchema;
  }

  //   List tables
  async getTables(orgSlug: string, projectSlug: string): Promise<string[]> {
    const schema = await this.getProjectSchema(orgSlug, projectSlug);

    const result = await this.drizzle.db.execute<{ table_name: string }>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = '${schema}'
         AND table_type = 'BASE TABLE'
       ORDER BY table_name ASC`,
    );

    return result.rows.map((r) => r.table_name);
  }

  // Get table structure
  async getTableInfo(
    orgSlug: string,
    projectSlug: string,
    tableName: string,
  ): Promise<TableInfo> {
    this.assertSafeIdentifier(tableName, 'table name');
    const schema = await this.getProjectSchema(orgSlug, projectSlug);

    const columnsResult = await this.drizzle.db.execute<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
    }>(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = '${schema}'
         AND table_name = '${tableName}'
       ORDER BY ordinal_position ASC`,
    );

    const pkResult = await this.drizzle.db.execute<{ column_name: string }>(
      `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
       WHERE tc.constraint_type = 'PRIMARY KEY'
         AND tc.table_schema = '${schema}'
         AND tc.table_name = '${tableName}'`,
    );

    const pkColumns = new Set(pkResult.rows.map((r) => r.column_name));

    const fkResult = await this.drizzle.db.execute<{
      constraint_name: string;
      column_name: string;
      foreign_table_name: string;
      foreign_column_name: string;
      delete_rule: string;
      update_rule: string;
      ordinal_position: number;
    }>(
      `SELECT
         tc.constraint_name,
         kcu.column_name,
         ccu.table_name AS foreign_table_name,
         ccu.column_name AS foreign_column_name,
         rc.delete_rule,
         rc.update_rule,
         kcu.ordinal_position
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
       JOIN information_schema.constraint_column_usage ccu
         ON ccu.constraint_name = tc.constraint_name
         AND ccu.constraint_schema = tc.table_schema
       JOIN information_schema.referential_constraints rc
         ON rc.constraint_name = tc.constraint_name
         AND rc.constraint_schema = tc.table_schema
       WHERE tc.constraint_type = 'FOREIGN KEY'
         AND tc.table_schema = '${schema}'
         AND tc.table_name = '${tableName}'
       ORDER BY tc.constraint_name, kcu.ordinal_position`,
    );

    const fkByName = new Map<string, TableForeignKey>();
    for (const row of fkResult.rows) {
      const existing = fkByName.get(row.constraint_name);
      if (existing) {
        existing.columns.push(row.column_name);
        existing.refColumns.push(row.foreign_column_name);
      } else {
        fkByName.set(row.constraint_name, {
          name: row.constraint_name,
          columns: [row.column_name],
          refTable: row.foreign_table_name,
          refColumns: [row.foreign_column_name],
          onDelete: row.delete_rule,
          onUpdate: row.update_rule,
        });
      }
    }
    const foreignKeys = [...fkByName.values()];

    const fkMap = new Map(
      foreignKeys.flatMap((fk) =>
        fk.columns.map((col, i) => [
          col,
          { table: fk.refTable, column: fk.refColumns[i] ?? fk.refColumns[0] },
        ]),
      ),
    );

    const uniqueResult = await this.drizzle.db.execute<{
      constraint_name: string;
      column_name: string;
      ordinal_position: number;
    }>(
      `SELECT tc.constraint_name, kcu.column_name, kcu.ordinal_position
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
       WHERE tc.constraint_type = 'UNIQUE'
         AND tc.table_schema = '${schema}'
         AND tc.table_name = '${tableName}'
       ORDER BY tc.constraint_name, kcu.ordinal_position`,
    );

    const uniqueByName = new Map<string, TableUniqueConstraint>();
    for (const row of uniqueResult.rows) {
      const existing = uniqueByName.get(row.constraint_name);
      if (existing) existing.columns.push(row.column_name);
      else {
        uniqueByName.set(row.constraint_name, {
          name: row.constraint_name,
          columns: [row.column_name],
        });
      }
    }
    const uniqueConstraints = [...uniqueByName.values()];

    const indexResult = await this.drizzle.db.execute<{
      indexname: string;
      indexdef: string;
    }>(
      `SELECT indexname, indexdef
       FROM pg_indexes
       WHERE schemaname = '${schema}'
         AND tablename = '${tableName}'
       ORDER BY indexname`,
    );

    const indexes: TableIndex[] = indexResult.rows.map((row) => {
      const unique = /\bUNIQUE\b/i.test(row.indexdef);
      const primary = row.indexname.endsWith('_pkey') || /\bPRIMARY KEY\b/i.test(row.indexdef);
      const colsMatch = row.indexdef.match(/\(([^)]+)\)\s*$/);
      const columns = colsMatch
        ? colsMatch[1]
            .split(',')
            .map((c) => c.trim().replace(/"/g, ''))
        : [];
      return { name: row.indexname, columns, unique, primary };
    });

    const rlsResult = await this.drizzle.db.execute<{ relrowsecurity: boolean }>(
      `SELECT c.relrowsecurity
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = '${schema}'
         AND c.relname = '${tableName}'
         AND c.relkind = 'r'`,
    );

    const policiesResult = await this.drizzle.db.execute<{
      policyname: string;
      cmd: string;
      roles: string[];
      qual: string | null;
      with_check: string | null;
      permissive: string;
    }>(
      `SELECT policyname, cmd, roles, qual, with_check, permissive
       FROM pg_policies
       WHERE schemaname = '${schema}'
         AND tablename = '${tableName}'
       ORDER BY policyname`,
    );

    const policies: TablePolicy[] = policiesResult.rows.map((p) => ({
      name: p.policyname,
      cmd: p.cmd,
      roles: p.roles ?? [],
      using: p.qual,
      withCheck: p.with_check,
      permissive: p.permissive === 'PERMISSIVE',
    }));

    const columns: TableColumn[] = columnsResult.rows.map((col) => ({
      name: col.column_name,
      type: this.mapPgTypeToColumnType(col.data_type),
      isNullable: col.is_nullable === 'YES',
      isPrimaryKey: pkColumns.has(col.column_name),
      defaultValue: col.column_default,
      foreignKey: fkMap.get(col.column_name) ?? null,
    }));

    if (columns.length === 0) {
      throw new NotFoundException(`Table "${tableName}" not found`);
    }

    return {
      name: tableName,
      columns,
      indexes,
      uniqueConstraints,
      foreignKeys,
      rlsEnabled: Boolean(rlsResult.rows[0]?.relrowsecurity),
      policies,
    };
  }

  private isMissingTableError(err: unknown): boolean {
    const code =
      err &&
      typeof err === 'object' &&
      'cause' in err &&
      err.cause &&
      typeof err.cause === 'object' &&
      'code' in err.cause
        ? String(err.cause.code)
        : null;

    return code === '42P01';
  }

  // Get table rows
  async getTableRows(
    orgSlug: string,
    projectSlug: string,
    tableName: string,
    limit = 100,
    offset = 0,
  ): Promise<{ rows: Record<string, unknown>[]; count: number }> {
    this.assertSafeIdentifier(tableName, 'table name');
    const schema = await this.getProjectSchema(orgSlug, projectSlug);

    try {
      const [rowsResult, countResult] = await Promise.all([
        this.drizzle.db.execute<Record<string, unknown>>(
          `SELECT * FROM "${schema}"."${tableName}" LIMIT ${limit} OFFSET ${offset}`,
        ),
        this.drizzle.db.execute<{ count: string }>(
          `SELECT COUNT(*) as count FROM "${schema}"."${tableName}"`,
        ),
      ]);

      return {
        rows: rowsResult.rows,
        count: parseInt(countResult.rows[0]?.count ?? '0', 10),
      };
    } catch (err) {
      if (this.isMissingTableError(err)) {
        throw new NotFoundException(`Table "${tableName}" not found`);
      }
      throw err;
    }
  }

  // Create table
  async createTable(
    orgSlug: string,
    projectSlug: string,
    dto: CreateTableDto,
  ): Promise<void> {
    this.assertSafeIdentifier(dto.name, 'table name');
    const schema = await this.getProjectSchema(orgSlug, projectSlug);

    const pkCols = dto.columns.filter((c) => c.isPrimaryKey);

    const columnDefs = dto.columns.map((col) => {
      this.assertSafeIdentifier(col.name, 'column name');

      if (col.foreignKeyTable) {
        this.assertSafeIdentifier(col.foreignKeyTable, 'foreign key table');
      }
      if (col.foreignKeyColumn) {
        this.assertSafeIdentifier(col.foreignKeyColumn, 'foreign key column');
      }

      const parts: string[] = [];
      let colDef = `"${col.name}" ${this.mapType(col.type)}`;

      if (col.isPrimaryKey && col.type === 'bigint' && !col.defaultValue) {
        colDef += ' GENERATED ALWAYS AS IDENTITY';
      }

      parts.push(colDef);

      if (col.isPrimaryKey && pkCols.length === 1) parts.push('PRIMARY KEY');
      if (col.unique && !col.isPrimaryKey) parts.push('UNIQUE');
      if (!col.isNullable && !col.isPrimaryKey) parts.push('NOT NULL');
      if (col.defaultValue) {
        parts.push(`DEFAULT ${this.formatDefault(col.defaultValue, col.type)}`);
      }

      return parts.join(' ');
    });

    const pkConstraint =
      pkCols.length > 1
        ? `PRIMARY KEY (${pkCols.map((c) => `"${c.name}"`).join(', ')})`
        : null;

    const fkConstraints = dto.columns
      .filter((col) => col.foreignKeyTable && col.foreignKeyColumn)
      .map(
        (col) =>
          `FOREIGN KEY ("${col.name}") REFERENCES "${schema}"."${col.foreignKeyTable!}" ("${col.foreignKeyColumn!}")`,
      );

    const allDefs = [
      ...columnDefs,
      ...(pkConstraint ? [pkConstraint] : []),
      ...fkConstraints,
    ].join(', ');

    await this.drizzle.db.execute(
      `CREATE TABLE "${schema}"."${dto.name}" (${allDefs})`,
    );
  }

  // Delete table
  async deleteTable(
    orgSlug: string,
    projectSlug: string,
    tableName: string,
  ): Promise<void> {
    this.assertSafeIdentifier(tableName, 'table name');
    const schema = await this.getProjectSchema(orgSlug, projectSlug);
    await this.drizzle.db.execute(
      `DROP TABLE IF EXISTS "${schema}"."${tableName}"`,
    );
  }

  // Add column
  async addColumn(
    orgSlug: string,
    projectSlug: string,
    tableName: string,
    dto: AddColumnDto,
  ): Promise<void> {
    this.assertSafeIdentifier(tableName, 'table name');
    this.assertSafeIdentifier(dto.name, 'column name');
    const schema = await this.getProjectSchema(orgSlug, projectSlug);

    let colDef = `"${dto.name}" ${this.mapType(dto.type)}`;
    if (dto.defaultValue) {
      colDef += ` DEFAULT ${this.formatDefault(dto.defaultValue, dto.type)}`;
    }
    if (dto.unique) colDef += ' UNIQUE';

    await this.drizzle.db.execute(
      `ALTER TABLE "${schema}"."${tableName}" ADD COLUMN ${colDef}`,
    );

    if (dto.foreignKeyTable && dto.foreignKeyColumn) {
      this.assertSafeIdentifier(dto.foreignKeyTable, 'foreign key table');
      this.assertSafeIdentifier(dto.foreignKeyColumn, 'foreign key column');
      await this.drizzle.db.execute(
        `ALTER TABLE "${schema}"."${tableName}"
         ADD FOREIGN KEY ("${dto.name}")
         REFERENCES "${schema}"."${dto.foreignKeyTable}" ("${dto.foreignKeyColumn}")`,
      );
    }
  }

  // Drop column
  async dropColumn(
    orgSlug: string,
    projectSlug: string,
    tableName: string,
    columnName: string,
  ): Promise<void> {
    this.assertSafeIdentifier(tableName, 'table name');
    this.assertSafeIdentifier(columnName, 'column name');
    const schema = await this.getProjectSchema(orgSlug, projectSlug);
    await this.drizzle.db.execute(
      `ALTER TABLE "${schema}"."${tableName}" DROP COLUMN "${columnName}"`,
    );
  }

  // Update row
  async updateRow(
    orgSlug: string,
    projectSlug: string,
    tableName: string,
    pkColumn: string,
    pkValue: string,
    updates: Record<string, unknown>,
  ): Promise<void> {
    this.assertSafeIdentifier(tableName, 'table name');
    this.assertSafeIdentifier(pkColumn, 'primary key column');
    Object.keys(updates).forEach((col) =>
      this.assertSafeIdentifier(col, 'column name'),
    );

    const schema = await this.getProjectSchema(orgSlug, projectSlug);

    const setFragments = Object.entries(updates).map(
      ([col, val]) => sql`${sql.identifier(col)} = ${val}`,
    );

    await this.drizzle.db.execute(
      sql`UPDATE ${sql.identifier(schema)}.${sql.identifier(tableName)}
          SET ${sql.join(setFragments, sql`, `)}
          WHERE ${sql.identifier(pkColumn)} = ${pkValue}`,
    );
  }

  private formatLiteral(value: unknown): string {
    if (value === null || value === undefined || value === '') return 'NULL';
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') return 'NULL';
      if (trimmed.toLowerCase() === 'true') return 'TRUE';
      if (trimmed.toLowerCase() === 'false') return 'FALSE';
      if (trimmed.toLowerCase() === 'null') return 'NULL';
      return `'${value.replace(/'/g, "''")}'`;
    }
    if (typeof value === 'object') {
      return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
    }
    throw new BadRequestException('Unsupported column value');
  }

  async insertRow(
    orgSlug: string,
    projectSlug: string,
    tableName: string,
    values: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    this.assertSafeIdentifier(tableName, 'table name');
    const schema = await this.getProjectSchema(orgSlug, projectSlug);

    const entries = Object.entries(values).filter(
      ([, v]) => v !== undefined && v !== '',
    );
    if (entries.length === 0) {
      throw new BadRequestException('Request body cannot be empty');
    }

    entries.forEach(([col]) => this.assertSafeIdentifier(col, 'column name'));

    const columns = entries.map(([c]) => `"${c}"`).join(', ');
    const literals = entries.map(([, v]) => this.formatLiteral(v)).join(', ');

    const result = await this.drizzle.db.execute<Record<string, unknown>>(
      `INSERT INTO "${schema}"."${tableName}" (${columns})
       VALUES (${literals})
       RETURNING *`,
    );

    if (!result.rows[0]) {
      throw new BadRequestException('Insert failed');
    }
    return result.rows[0];
  }

  async deleteRow(
    orgSlug: string,
    projectSlug: string,
    tableName: string,
    pkColumn: string,
    pkValue: string,
  ): Promise<Record<string, unknown>> {
    this.assertSafeIdentifier(tableName, 'table name');
    this.assertSafeIdentifier(pkColumn, 'primary key column');
    const schema = await this.getProjectSchema(orgSlug, projectSlug);

    const result = await this.drizzle.db.execute<Record<string, unknown>>(
      `DELETE FROM "${schema}"."${tableName}"
       WHERE "${pkColumn}" = ${this.formatLiteral(pkValue)}
       RETURNING *`,
    );

    if (!result.rows[0]) throw new NotFoundException('Row not found');
    return result.rows[0];
  }

  async createIndex(
    orgSlug: string,
    projectSlug: string,
    tableName: string,
    dto: CreateIndexDto,
  ): Promise<void> {
    this.assertSafeIdentifier(tableName, 'table name');
    dto.columns.forEach((c) => this.assertSafeIdentifier(c, 'column name'));
    const schema = await this.getProjectSchema(orgSlug, projectSlug);
    const indexName =
      dto.name ??
      `${tableName}_${dto.columns.join('_')}_${dto.unique ? 'uidx' : 'idx'}`;
    this.assertSafeIdentifier(indexName, 'index name');
    const cols = dto.columns.map((c) => `"${c}"`).join(', ');
    const unique = dto.unique ? 'UNIQUE ' : '';
    await this.drizzle.db.execute(
      `CREATE ${unique}INDEX "${indexName}" ON "${schema}"."${tableName}" (${cols})`,
    );
  }

  async dropIndex(
    orgSlug: string,
    projectSlug: string,
    indexName: string,
  ): Promise<void> {
    this.assertSafeIdentifier(indexName, 'index name');
    const schema = await this.getProjectSchema(orgSlug, projectSlug);
    await this.drizzle.db.execute(
      `DROP INDEX IF EXISTS "${schema}"."${indexName}"`,
    );
  }

  async createUniqueConstraint(
    orgSlug: string,
    projectSlug: string,
    tableName: string,
    dto: CreateUniqueConstraintDto,
  ): Promise<void> {
    this.assertSafeIdentifier(tableName, 'table name');
    dto.columns.forEach((c) => this.assertSafeIdentifier(c, 'column name'));
    const schema = await this.getProjectSchema(orgSlug, projectSlug);
    const name =
      dto.name ?? `${tableName}_${dto.columns.join('_')}_key`;
    this.assertSafeIdentifier(name, 'constraint name');
    const cols = dto.columns.map((c) => `"${c}"`).join(', ');
    await this.drizzle.db.execute(
      `ALTER TABLE "${schema}"."${tableName}"
       ADD CONSTRAINT "${name}" UNIQUE (${cols})`,
    );
  }

  async dropConstraint(
    orgSlug: string,
    projectSlug: string,
    tableName: string,
    constraintName: string,
  ): Promise<void> {
    this.assertSafeIdentifier(tableName, 'table name');
    this.assertSafeIdentifier(constraintName, 'constraint name');
    const schema = await this.getProjectSchema(orgSlug, projectSlug);
    await this.drizzle.db.execute(
      `ALTER TABLE "${schema}"."${tableName}"
       DROP CONSTRAINT IF EXISTS "${constraintName}"`,
    );
  }

  async createForeignKey(
    orgSlug: string,
    projectSlug: string,
    tableName: string,
    dto: CreateForeignKeyDto,
  ): Promise<void> {
    this.assertSafeIdentifier(tableName, 'table name');
    this.assertSafeIdentifier(dto.refTable, 'ref table');
    dto.columns.forEach((c) => this.assertSafeIdentifier(c, 'column name'));
    dto.refColumns.forEach((c) =>
      this.assertSafeIdentifier(c, 'ref column name'),
    );
    if (dto.columns.length !== dto.refColumns.length) {
      throw new BadRequestException(
        'columns and refColumns must have the same length',
      );
    }
    const schema = await this.getProjectSchema(orgSlug, projectSlug);
    const name =
      dto.name ?? `${tableName}_${dto.columns.join('_')}_fkey`;
    this.assertSafeIdentifier(name, 'constraint name');
    const cols = dto.columns.map((c) => `"${c}"`).join(', ');
    const refs = dto.refColumns.map((c) => `"${c}"`).join(', ');
    const onDelete = dto.onDelete ? ` ON DELETE ${dto.onDelete}` : '';
    const onUpdate = dto.onUpdate ? ` ON UPDATE ${dto.onUpdate}` : '';
    await this.drizzle.db.execute(
      `ALTER TABLE "${schema}"."${tableName}"
       ADD CONSTRAINT "${name}"
       FOREIGN KEY (${cols})
       REFERENCES "${schema}"."${dto.refTable}" (${refs})${onDelete}${onUpdate}`,
    );
  }

  async setRls(
    orgSlug: string,
    projectSlug: string,
    tableName: string,
    dto: SetRlsDto,
  ): Promise<void> {
    this.assertSafeIdentifier(tableName, 'table name');
    const schema = await this.getProjectSchema(orgSlug, projectSlug);
    await this.projectsService.ensureProjectRoles(schema);
    const action = dto.enabled ? 'ENABLE' : 'DISABLE';
    await this.drizzle.db.execute(
      `ALTER TABLE "${schema}"."${tableName}" ${action} ROW LEVEL SECURITY`,
    );
    if (dto.enabled && dto.force) {
      await this.drizzle.db.execute(
        `ALTER TABLE "${schema}"."${tableName}" FORCE ROW LEVEL SECURITY`,
      );
    }
    if (!dto.enabled) {
      await this.drizzle.db.execute(
        `ALTER TABLE "${schema}"."${tableName}" NO FORCE ROW LEVEL SECURITY`,
      );
    }
  }

  async createPolicy(
    orgSlug: string,
    projectSlug: string,
    tableName: string,
    dto: CreatePolicyDto,
  ): Promise<void> {
    this.assertSafeIdentifier(tableName, 'table name');
    this.assertSafeIdentifier(dto.name, 'policy name');
    const schema = await this.getProjectSchema(orgSlug, projectSlug);
    await this.projectsService.ensureProjectRoles(schema);
    const roles =
      dto.roles && dto.roles.length > 0
        ? dto.roles
            .map((r) => {
              if (r === 'public' || r === 'PUBLIC') return 'PUBLIC';
              if (r === 'anon') return `"${schema}_anon"`;
              if (r === 'authenticated') return `"${schema}_authenticated"`;
              this.assertSafeIdentifier(r.replace(/"/g, ''), 'role');
              return `"${r}"`;
            })
            .join(', ')
        : 'PUBLIC';
    const permissive = dto.permissive === false ? 'AS RESTRICTIVE' : 'AS PERMISSIVE';
    const using = dto.using ? ` USING (${dto.using})` : '';
    const withCheck = dto.withCheck ? ` WITH CHECK (${dto.withCheck})` : '';
    await this.drizzle.db.execute(
      `CREATE POLICY "${dto.name}" ON "${schema}"."${tableName}"
       ${permissive}
       FOR ${dto.cmd}
       TO ${roles}${using}${withCheck}`,
    );
  }

  async dropPolicy(
    orgSlug: string,
    projectSlug: string,
    tableName: string,
    policyName: string,
  ): Promise<void> {
    this.assertSafeIdentifier(tableName, 'table name');
    this.assertSafeIdentifier(policyName, 'policy name');
    const schema = await this.getProjectSchema(orgSlug, projectSlug);
    await this.drizzle.db.execute(
      `DROP POLICY IF EXISTS "${policyName}" ON "${schema}"."${tableName}"`,
    );
  }
}
