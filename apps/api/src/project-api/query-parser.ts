import { BadRequestException } from '@nestjs/common';
import {
  RESERVED_QUERY_PARAMS,
  FILTER_OPERATORS,
  type FilterOperator,
} from '@voltbase/constants';

export interface ParsedQuery {
  select: string[];
  filters: FilterClause[];
  orderBy: OrderClause | null;
  limit: number;
  offset: number;
}

interface FilterClause {
  column: string;
  operator: string;
  value: string;
}

interface OrderClause {
  column: string;
  direction: 'ASC' | 'DESC';
}

function assertSafeIdentifier(name: string, label: string): void {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new BadRequestException(`Invalid ${label}: ${name}`);
  }
}

function formatSqlValue(operator: string, rawValue: string): string {
  const value = rawValue.replace(/;/g, '');

  if (operator === 'IS') {
    return value.toUpperCase() === 'NULL' ? 'NULL' : 'NOT NULL';
  }

  if (operator === 'LIKE' || operator === 'ILIKE') {
    return `'${value.replace(/'/g, "''")}'`;
  }

  if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
    return value.toLowerCase();
  }

  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return value;
  }

  return `'${value.replace(/'/g, "''")}'`;
}

export function parseQueryParams(params: Record<string, string>): ParsedQuery {
  const filters: FilterClause[] = [];
  let select: string[] = [];
  let orderBy: OrderClause | null = null;
  let limit = 100;
  let offset = 0;

  for (const [key, value] of Object.entries(params)) {
    if (RESERVED_QUERY_PARAMS.has(key)) {
      switch (key) {
        case 'select':
          select = value
            .split(',')
            .map((c) => c.trim())
            .filter(Boolean);
          select.forEach((col) => assertSafeIdentifier(col, 'select column'));
          break;
        case 'order': {
          const [col, dir] = value.split('.');
          assertSafeIdentifier(col, 'order column');
          orderBy = {
            column: col,
            direction: dir?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
          };
          break;
        }
        case 'limit':
          limit = Math.min(parseInt(value, 10) || 100, 1000);
          break;
        case 'offset':
          offset = Math.max(parseInt(value, 10) || 0, 0);
          break;
      }
      continue;
    }

    assertSafeIdentifier(key, 'filter column');

    const dotIndex = value.indexOf('.');
    if (dotIndex === -1) continue;

    const operator = value.slice(0, dotIndex) as FilterOperator;
    const filterValue = value.slice(dotIndex + 1);

    if (!(operator in FILTER_OPERATORS)) continue;

    filters.push({
      column: key,
      operator: FILTER_OPERATORS[operator],
      value: filterValue,
    });
  }

  return { select, filters, orderBy, limit, offset };
}

export function buildWhereClause(filters: FilterClause[]): string {
  if (filters.length === 0) return '';

  const clauses = filters.map(({ column, operator, value }) => {
    const sqlValue = formatSqlValue(operator, value);

    if (operator === 'IS') {
      return `"${column}" IS ${sqlValue}`;
    }

    if (operator === 'LIKE' || operator === 'ILIKE') {
      return `"${column}" ${operator} ${sqlValue}`;
    }

    return `"${column}" ${operator} ${sqlValue}`;
  });

  return `WHERE ${clauses.join(' AND ')}`;
}
