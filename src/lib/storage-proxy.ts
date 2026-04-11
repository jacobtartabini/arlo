/**
 * Client helper for uploading/downloading/deleting files via the storage-proxy edge function.
 * This bypasses Supabase Auth RLS (since we use Tailscale JWT auth) by routing through
 * the edge function which uses the service-role key.
 */

import { getAuthHeaders } from '@/lib/arloAuth';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const PROXY_URL = `${SUPABASE_URL}/functions/v1/storage-proxy`;

export async function storageUpload(
  bucket: string,
  filePath: string,
  file: File
): Promise<{ path: string } | null> {
  const authHeaders = await getAuthHeaders();
  if (!authHeaders) return null;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileName', file.name);
  formData.append('bucket', bucket);
  formData.append('customPath', filePath);

  const res = await fetch(`${PROXY_URL}/upload`, {
    method: 'POST',
    headers: { ...authHeaders },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Upload failed: ${err}`);
  }

  const data = await res.json();
  return { path: data.path };
}

export async function storageGetSignedUrl(
  bucket: string,
  filePath: string,
  expiresIn = 3600
): Promise<string | null> {
  const authHeaders = await getAuthHeaders();
  if (!authHeaders) return null;

  const res = await fetch(`${PROXY_URL}/signed-url`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: filePath, bucket, expiresIn }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.signedUrl ?? null;
}

export async function storageDelete(
  bucket: string,
  paths: string[]
): Promise<boolean> {
  const authHeaders = await getAuthHeaders();
  if (!authHeaders) return false;

  const res = await fetch(`${PROXY_URL}/delete`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ paths, bucket }),
  });

  return res.ok;
}
