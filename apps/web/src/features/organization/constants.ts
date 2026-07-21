export const ORGANIZATION_INTENT = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
} as const;

export type OrganizationIntent =
  (typeof ORGANIZATION_INTENT)[keyof typeof ORGANIZATION_INTENT];
