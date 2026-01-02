/**
 * Authenticated Storage Module
 * 
 * Handles file uploads/downloads through the storage-proxy edge function
 * with Tailscale JWT authentication.
 */

import { getArloToken } from './arloAuth';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export interface UploadResult {
  success: boolean;
  path?: string;
  signedUrl?: string;
  error?: string;
}

/**
 * Upload a file through the authenticated storage proxy
 */
export async function uploadFile(file: File, filePath: string): Promise<UploadResult> {
  const token = await getArloToken();
  
  if (!token) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', filePath);

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/storage-proxy/upload`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Upload error:', errorData);
      return { success: false, error: errorData.error || 'Upload failed' };
    }

    const data = await response.json();

    if (!data?.success) {
      return { success: false, error: data?.error || 'Upload failed' };
    }

    // Get a signed URL for the uploaded file
    const signedUrlResult = await getSignedUrl(data.path);
    
    return { 
      success: true, 
      path: data.path,
      signedUrl: signedUrlResult.signedUrl 
    };
  } catch (error) {
    console.error('Upload error:', error);
    return { success: false, error: 'Upload failed' };
  }
}

/**
 * Get a signed URL for accessing a file
 */
export async function getSignedUrl(path: string, expiresIn = 3600): Promise<{ signedUrl?: string; error?: string }> {
  const token = await getArloToken();
  
  if (!token) {
    return { error: 'Authentication required' };
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/storage-proxy/signed-url`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path, expiresIn }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: errorData.error || 'Failed to get signed URL' };
    }

    const result = await response.json();
    return { signedUrl: result.signedUrl };
  } catch (error) {
    console.error('Signed URL error:', error);
    return { error: 'Failed to get signed URL' };
  }
}

/**
 * Delete files from storage
 */
export async function deleteFiles(paths: string[]): Promise<{ success: boolean; error?: string }> {
  const token = await getArloToken();
  
  if (!token) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/storage-proxy/delete`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paths }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.error || 'Delete failed' };
    }

    return { success: true };
  } catch (error) {
    console.error('Delete error:', error);
    return { success: false, error: 'Delete failed' };
  }
}
