'use server';

import apiClient from '@/lib/axios';
import { authCookieHeaders, getApiErrorMessage } from '@/server-utils/api';
import type {
  BucketAccess,
  StorageBucket,
  StorageObject,
} from '@voltbase/types';

export type StorageActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function storageBase(orgSlug: string, projectSlug: string) {
  return `/orgs/${orgSlug}/projects/${projectSlug}/storage`;
}

export async function listBucketObjectsAction(
  orgSlug: string,
  projectSlug: string,
  bucketId: string,
): Promise<StorageActionResult<StorageObject[]>> {
  try {
    const { data } = await apiClient.get<StorageObject[]>(
      `${storageBase(orgSlug, projectSlug)}/buckets/${bucketId}/objects`,
      await authCookieHeaders(),
    );
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: getApiErrorMessage(err, 'Failed to load objects') };
  }
}

export async function createBucketAction(
  orgSlug: string,
  projectSlug: string,
  input: { name: string; access: BucketAccess },
): Promise<StorageActionResult<StorageBucket>> {
  try {
    const { data } = await apiClient.post<StorageBucket>(
      `${storageBase(orgSlug, projectSlug)}/buckets`,
      input,
      await authCookieHeaders(),
    );
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: getApiErrorMessage(err, 'Failed to create bucket') };
  }
}

export async function deleteBucketAction(
  orgSlug: string,
  projectSlug: string,
  bucketId: string,
): Promise<StorageActionResult<void>> {
  try {
    await apiClient.delete(
      `${storageBase(orgSlug, projectSlug)}/buckets/${bucketId}`,
      await authCookieHeaders(),
    );
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: getApiErrorMessage(err, 'Failed to delete bucket') };
  }
}

export async function deleteObjectAction(
  orgSlug: string,
  projectSlug: string,
  objectId: string,
): Promise<StorageActionResult<void>> {
  try {
    await apiClient.delete(
      `${storageBase(orgSlug, projectSlug)}/objects/${objectId}`,
      await authCookieHeaders(),
    );
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: getApiErrorMessage(err, 'Failed to delete object') };
  }
}

export async function getSignedUrlAction(
  orgSlug: string,
  projectSlug: string,
  objectId: string,
): Promise<StorageActionResult<{ url: string }>> {
  try {
    const { data } = await apiClient.get<{ url: string }>(
      `${storageBase(orgSlug, projectSlug)}/objects/${objectId}/signed-url`,
      await authCookieHeaders(),
    );
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: getApiErrorMessage(err, 'Failed to get signed URL') };
  }
}

export async function registerUploadedObjectAction(
  orgSlug: string,
  projectSlug: string,
  bucketId: string,
  body: {
    name: string;
    size: number;
    type: string;
    utKey: string;
    url: string;
  },
): Promise<StorageActionResult<StorageObject>> {
  try {
    const { data } = await apiClient.post<StorageObject>(
      `${storageBase(orgSlug, projectSlug)}/buckets/${bucketId}/objects`,
      body,
      await authCookieHeaders(),
    );
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: getApiErrorMessage(err, 'Failed to register uploaded file'),
    };
  }
}
