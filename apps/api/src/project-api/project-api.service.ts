import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  FullQueryResults,
  NeonQueryFunction,
} from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { projects } from '../db/schema';
import { ProjectsService } from '../projects/projects.service';
import { PROJECT_KEY_ROLES } from '@voltbase/constants';
import { parseQueryParams, buildWhereClause } from './query-parser';
import type { ProjectKeyPayload } from './project-key.guard';

export interface RestExecutionContext {
  projectKey: ProjectKeyPayload;
  userJwt?: { sub: string; email?: string } | null;
}

export interface NestedEmbed {
  alias: string;
  table: string;
  columns: string[] | '*';
}

@Injectable()
export class ProjectApiService {
  constructor(
    private drizzle: DrizzleService,
    private projectsService: ProjectsService,
  ) {}

  private assertSafeIdentifier(name: string, label: string): void {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      throw new BadRequestException({
        message: `Invalid ${label}: ${name}`,
        code: 'invalid_identifier',
      });
    }
  }

  private formatLiteral(value: unknown): string {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }
    if (typeof value === 'object') {
      return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
    }
    throw new BadRequestException({
      message: 'Unsupported column value',
      code: 'invalid_value',
    });
  }

  private getNeonClient(): NeonQueryFunction<false, true> {
    const client = (
      this.drizzle.db as unknown as {
        $client: NeonQueryFunction<false, true>;
      }
    ).$client;
    if (!client?.transaction) {
      throw new Error('Neon HTTP client is not available');
    }
    return client;
  }

  private mapPgError(err: unknown): never {
    const message = err instanceof Error ? err.message : 'Query failed';
    const cause =
      err && typeof err === 'object' && 'cause' in err
        ? (err as { cause?: { code?: string; detail?: string } }).cause
        : undefined;
    const code = cause?.code;
    if (code === '42501') {
      throw new ForbiddenException({
        message: 'Permission denied by row level security or grants',
        code: 'rls_violation',
        details: cause?.detail ?? null,
      });
    }
    if (code === '42P01') {
      throw new NotFoundException({
        message: 'Relation not found',
        code: 'not_found',
      });
    }
    throw new BadRequestException({
      message,
      code: code ?? 'query_error',
      details: cause?.detail ?? null,
    });
  }

  async resolveProjectSchema(
    projectId: string,
    projectSlug: string,
  ): Promise<string> {
    const [project] = await this.drizzle.db
      .select({ dbSchema: projects.dbSchema, slug: projects.slug })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) throw new NotFoundException('Project not found');

    if (project.slug !== projectSlug) {
      throw new ForbiddenException('API key does not match this project URL');
    }

    return project.dbSchema;
  }

  private async getPrimaryKeyColumn(
    schema: string,
    tableName: string,
  ): Promise<string> {
    const result = await this.drizzle.db.execute<{ column_name: string }>(
      `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
       WHERE tc.constraint_type = 'PRIMARY KEY'
         AND tc.table_schema = '${schema}'
         AND tc.table_name = '${tableName}'
       ORDER BY kcu.ordinal_position ASC
       LIMIT 1`,
    );

    const pk = result.rows[0]?.column_name;
    if (!pk) {
      throw new BadRequestException({
        message: `Table "${tableName}" has no primary key`,
        code: 'no_primary_key',
      });
    }

    return pk;
  }

  /** Parse select=id,name,orders(*) or author:users(id,name) */
  private parseSelect(raw: string | undefined): {
    columns: string[];
    embeds: NestedEmbed[];
  } {
    if (!raw || raw.trim() === '*' || raw.trim() === '') {
      return { columns: [], embeds: [] };
    }

    const embeds: NestedEmbed[] = [];
    const columns: string[] = [];
    const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);

    for (const part of parts) {
      const embedMatch = part.match(
        /^(?:([a-zA-Z_][a-zA-Z0-9_]*):)?([a-zA-Z_][a-zA-Z0-9_]*)\(([^)]*)\)$/,
      );
      if (embedMatch) {
        const alias = embedMatch[1] ?? embedMatch[2];
        const table = embedMatch[2];
        const inner = embedMatch[3].trim();
        if (inner.includes('(')) {
          throw new BadRequestException({
            message: 'Nested embeds deeper than one level are not supported',
            code: 'nested_too_deep',
          });
        }
        this.assertSafeIdentifier(alias, 'embed alias');
        this.assertSafeIdentifier(table, 'embed table');
        const cols =
          !inner || inner === '*'
            ? ('*' as const)
            : inner.split(',').map((c) => c.trim()).filter(Boolean);
        if (Array.isArray(cols)) {
          cols.forEach((c) => this.assertSafeIdentifier(c, 'embed column'));
        }
        embeds.push({ alias, table, columns: cols });
        continue;
      }

      if (part === '*') continue;
      this.assertSafeIdentifier(part, 'select column');
      columns.push(part);
    }

    return { columns, embeds };
  }

  private async findFkLink(
    schema: string,
    parentTable: string,
    childTable: string,
  ): Promise<{ parentCol: string; childCol: string; direction: 'out' | 'in' }> {
    // Parent has FK → child (many-to-one embed): parent.col → child.pk
    const out = await this.drizzle.db.execute<{
      column_name: string;
      foreign_column_name: string;
    }>(
      `SELECT kcu.column_name, ccu.column_name AS foreign_column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
       JOIN information_schema.constraint_column_usage ccu
         ON ccu.constraint_name = tc.constraint_name
         AND ccu.constraint_schema = tc.table_schema
       WHERE tc.constraint_type = 'FOREIGN KEY'
         AND tc.table_schema = '${schema}'
         AND tc.table_name = '${parentTable}'
         AND ccu.table_name = '${childTable}'
       LIMIT 1`,
    );
    if (out.rows[0]) {
      return {
        parentCol: out.rows[0].column_name,
        childCol: out.rows[0].foreign_column_name,
        direction: 'out',
      };
    }

    // Child has FK → parent (one-to-many): child.col → parent.pk
    const inn = await this.drizzle.db.execute<{
      column_name: string;
      foreign_column_name: string;
    }>(
      `SELECT kcu.column_name, ccu.column_name AS foreign_column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
       JOIN information_schema.constraint_column_usage ccu
         ON ccu.constraint_name = tc.constraint_name
         AND ccu.constraint_schema = tc.table_schema
       WHERE tc.constraint_type = 'FOREIGN KEY'
         AND tc.table_schema = '${schema}'
         AND tc.table_name = '${childTable}'
         AND ccu.table_name = '${parentTable}'
       LIMIT 1`,
    );
    if (inn.rows[0]) {
      return {
        parentCol: inn.rows[0].foreign_column_name,
        childCol: inn.rows[0].column_name,
        direction: 'in',
      };
    }

    throw new BadRequestException({
      message: `No foreign key between "${parentTable}" and "${childTable}"`,
      code: 'embed_no_fk',
    });
  }

  private async runWithRls<T>(
    schema: string,
    ctx: RestExecutionContext,
    sql: string,
  ): Promise<T[]> {
    await this.projectsService.ensureProjectRoles(schema);

    const bypass =
      ctx.projectKey.role === PROJECT_KEY_ROLES.SERVICE_ROLE && !ctx.userJwt;

    try {
      if (bypass) {
        const result = await this.drizzle.db.execute<
          Record<string, unknown>
        >(sql);
        return result.rows as T[];
      }

      const roleName = ctx.userJwt
        ? `${schema}_authenticated`
        : `${schema}_anon`;
      const claims = JSON.stringify({
        sub: ctx.userJwt?.sub ?? '',
        email: ctx.userJwt?.email ?? '',
        role: ctx.userJwt ? 'authenticated' : 'anon',
      }).replace(/'/g, "''");
      const sub = (ctx.userJwt?.sub ?? '').replace(/'/g, "''");

      const neonSql = this.getNeonClient();
      const results = await neonSql.transaction(
        (txn) => [
          txn`${txn.unsafe(`SET LOCAL ROLE "${roleName}"`)}`,
          txn`${txn.unsafe(`SELECT set_config('request.jwt.claims', '${claims}', true)`)}`,
          txn`${txn.unsafe(`SELECT set_config('request.jwt.claim.sub', '${sub}', true)`)}`,
          txn`${txn.unsafe(`SET LOCAL search_path TO "${schema}", public`)}`,
          txn`${txn.unsafe(sql)}`,
        ],
        { fullResults: true, readOnly: false },
      );

      const last = results[results.length - 1] as FullQueryResults<false>;
      return (last.rows ?? []) as T[];
    } catch (err) {
      this.mapPgError(err);
    }
  }

  async getRows(
    projectId: string,
    projectSlug: string,
    tableName: string,
    rawParams: Record<string, string>,
    ctx: RestExecutionContext,
  ) {
    this.assertSafeIdentifier(tableName, 'table name');
    const schema = await this.resolveProjectSchema(projectId, projectSlug);

    const selectRaw = rawParams.select;
    const { columns: selectCols, embeds } = this.parseSelect(selectRaw);

    // Strip select so filter parser doesn't choke on embeds
    const paramsForFilters = { ...rawParams };
    delete paramsForFilters.select;
    if (selectCols.length > 0) {
      paramsForFilters.select = selectCols.join(',');
    }

    const { filters, orderBy, limit, offset } =
      parseQueryParams(paramsForFilters);

    const columns =
      selectCols.length > 0
        ? selectCols.map((c) => `"${c}"`).join(', ')
        : '*';

    const where = buildWhereClause(filters);
    const order = orderBy
      ? `ORDER BY "${orderBy.column}" ${orderBy.direction}`
      : '';

    const sql = `
      SELECT ${columns}
      FROM "${schema}"."${tableName}"
      ${where}
      ${order}
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const rows = await this.runWithRls<Record<string, unknown>>(
      schema,
      ctx,
      sql,
    );

    if (embeds.length === 0 || rows.length === 0) return rows;

    for (const embed of embeds) {
      const link = await this.findFkLink(schema, tableName, embed.table);
      const keys = [
        ...new Set(
          rows
            .map((r) => r[link.parentCol])
            .filter((v) => v !== null && v !== undefined),
        ),
      ];
      if (keys.length === 0) {
        for (const row of rows) {
          row[embed.alias] = link.direction === 'in' ? [] : null;
        }
        continue;
      }

      const embedCols =
        embed.columns === '*'
          ? '*'
          : embed.columns.map((c) => `"${c}"`).join(', ');
      const inList = keys.map((k) => this.formatLiteral(k)).join(', ');
      const childSql = `
        SELECT ${embedCols}
        FROM "${schema}"."${embed.table}"
        WHERE "${link.childCol}" IN (${inList})
      `;
      const children = await this.runWithRls<Record<string, unknown>>(
        schema,
        ctx,
        childSql,
      );

      if (link.direction === 'out') {
        const byPk = new Map(
          children.map((c) => [String(c[link.childCol]), c]),
        );
        for (const row of rows) {
          row[embed.alias] =
            byPk.get(String(row[link.parentCol])) ?? null;
        }
      } else {
        const byParent = new Map<string, Record<string, unknown>[]>();
        for (const child of children) {
          const key = String(child[link.childCol]);
          const list = byParent.get(key) ?? [];
          list.push(child);
          byParent.set(key, list);
        }
        for (const row of rows) {
          row[embed.alias] =
            byParent.get(String(row[link.parentCol])) ?? [];
        }
      }
    }

    return rows;
  }

  async insertRow(
    projectId: string,
    projectSlug: string,
    tableName: string,
    body: Record<string, unknown>,
    ctx: RestExecutionContext,
  ) {
    this.assertSafeIdentifier(tableName, 'table name');
    const schema = await this.resolveProjectSchema(projectId, projectSlug);

    const entries = Object.entries(body);
    if (entries.length === 0) {
      throw new BadRequestException({
        message: 'Request body cannot be empty',
        code: 'empty_body',
      });
    }

    entries.forEach(([col]) => this.assertSafeIdentifier(col, 'column name'));

    const columns = entries.map(([c]) => `"${c}"`).join(', ');
    const values = entries.map(([, v]) => this.formatLiteral(v)).join(', ');

    const sql = `
      INSERT INTO "${schema}"."${tableName}" (${columns})
      VALUES (${values})
      RETURNING *
    `;

    const rows = await this.runWithRls<Record<string, unknown>>(
      schema,
      ctx,
      sql,
    );
    return rows[0];
  }

  async updateRow(
    projectId: string,
    projectSlug: string,
    tableName: string,
    rowId: string,
    body: Record<string, unknown>,
    ctx: RestExecutionContext,
  ) {
    this.assertSafeIdentifier(tableName, 'table name');
    const schema = await this.resolveProjectSchema(projectId, projectSlug);
    const pkColumn = await this.getPrimaryKeyColumn(schema, tableName);

    const entries = Object.entries(body);
    if (entries.length === 0) {
      throw new BadRequestException({
        message: 'Request body cannot be empty',
        code: 'empty_body',
      });
    }

    entries.forEach(([col]) => this.assertSafeIdentifier(col, 'column name'));

    const setClauses = entries
      .map(([col, val]) => `"${col}" = ${this.formatLiteral(val)}`)
      .join(', ');

    const sql = `
      UPDATE "${schema}"."${tableName}"
      SET ${setClauses}
      WHERE "${pkColumn}" = ${this.formatLiteral(rowId)}
      RETURNING *
    `;

    const rows = await this.runWithRls<Record<string, unknown>>(
      schema,
      ctx,
      sql,
    );
    if (!rows[0]) throw new NotFoundException('Row not found');
    return rows[0];
  }

  async deleteRow(
    projectId: string,
    projectSlug: string,
    tableName: string,
    rowId: string,
    ctx: RestExecutionContext,
  ) {
    this.assertSafeIdentifier(tableName, 'table name');
    const schema = await this.resolveProjectSchema(projectId, projectSlug);
    const pkColumn = await this.getPrimaryKeyColumn(schema, tableName);

    const sql = `
      DELETE FROM "${schema}"."${tableName}"
      WHERE "${pkColumn}" = ${this.formatLiteral(rowId)}
      RETURNING *
    `;

    const rows = await this.runWithRls<Record<string, unknown>>(
      schema,
      ctx,
      sql,
    );
    if (!rows[0]) throw new NotFoundException('Row not found');
    return rows[0];
  }

  async callRpc(
    projectId: string,
    projectSlug: string,
    fnName: string,
    args: Record<string, unknown>,
    ctx: RestExecutionContext,
  ) {
    this.assertSafeIdentifier(fnName, 'function name');
    const schema = await this.resolveProjectSchema(projectId, projectSlug);

    const exists = await this.drizzle.db.execute<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = '${schema}'
           AND p.proname = '${fnName}'
       ) AS exists`,
    );
    if (!exists.rows[0]?.exists) {
      throw new NotFoundException({
        message: `Function "${fnName}" not found in project schema`,
        code: 'rpc_not_found',
      });
    }

    const entries = Object.entries(args ?? {});
    entries.forEach(([k]) => this.assertSafeIdentifier(k, 'argument name'));
    const argList =
      entries.length === 0
        ? ''
        : entries
            .map(([k, v]) => `"${k}" := ${this.formatLiteral(v)}`)
            .join(', ');

    const sql = `SELECT * FROM "${schema}"."${fnName}"(${argList})`;
    return this.runWithRls<Record<string, unknown>>(schema, ctx, sql);
  }
}
