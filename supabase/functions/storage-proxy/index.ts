/**
 * Storage Proxy Edge Function
 * 
 * Proxies file uploads and downloads for allowed storage buckets
 * with Tailscale JWT authentication since we don't use Supabase Auth.
 * 
 * SECURITY: All file operations are restricted to paths under the user's ID prefix.
 * Users can only access files in their own directory: {userId}/...
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { 
  verifyArloJWT, 
  handleCorsOptions, 
  jsonResponse, 
  errorResponse, 
  unauthorizedResponse,
  forbiddenResponse,
  getCorsHeaders
} from '../_shared/arloAuth.ts';

const ALLOWED_BUCKETS = ['chat-attachments', 'creation-assets'];
const DEFAULT_BUCKET = 'chat-attachments';
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_FILENAME_LENGTH = 255;

// Initialize Supabase admin client with service role key
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

/**
 * Sanitize filename to prevent path traversal and other attacks
 */
function sanitizeFileName(fileName: string): string {
  let sanitized = fileName.replace(/[\/\\:*?"<>|\x00]/g, '_');
  sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '');
  if (sanitized.length > MAX_FILENAME_LENGTH) {
    const ext = sanitized.lastIndexOf('.');
    if (ext > 0) {
      const extension = sanitized.slice(ext);
      sanitized = sanitized.slice(0, MAX_FILENAME_LENGTH - extension.length) + extension;
    } else {
      sanitized = sanitized.slice(0, MAX_FILENAME_LENGTH);
    }
  }
  return sanitized || 'unnamed_file';
}

/**
 * Validate that a path belongs to the specified user
 */
function isUserOwnedPath(path: string, userId: string): boolean {
  return path.startsWith(`${userId}/`);
}

/**
 * Generate a secure file path under the user's directory
 */
function generateUserFilePath(userId: string, fileName: string): string {
  const sanitizedName = sanitizeFileName(fileName);
  const timestamp = Date.now();
  const randomSuffix = crypto.randomUUID().slice(0, 8);
  return `${userId}/${timestamp}-${randomSuffix}-${sanitizedName}`;
}

function resolveBucket(raw: string | null): string {
  const bucket = raw?.trim() || DEFAULT_BUCKET;
  if (!ALLOWED_BUCKETS.includes(bucket)) {
    throw new Error(`Bucket not allowed: ${bucket}`);
  }
  return bucket;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  // Verify JWT authentication
  const authResult = await verifyArloJWT(req);
  if (!authResult.authenticated) {
    return unauthorizedResponse(req, authResult.error || 'Authentication required');
  }

  const userId = authResult.userId;
  if (!userId) {
    console.error('No userId in auth result');
    return unauthorizedResponse(req, 'Invalid authentication');
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const action = pathParts[pathParts.length - 1];

  console.log(`Storage proxy: ${action} request from user ${userId}`);

  try {
    switch (action) {
      case 'upload': {
        if (req.method !== 'POST') {
          return errorResponse(req, 'Method not allowed', 405);
        }

        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const fileName = formData.get('fileName') as string | null;
        const bucketRaw = formData.get('bucket') as string | null;
        const customPath = formData.get('customPath') as string | null;

        let bucket: string;
        try {
          bucket = resolveBucket(bucketRaw);
        } catch (e) {
          return errorResponse(req, (e as Error).message, 400);
        }

        if (!file) {
          return errorResponse(req, 'Missing file', 400);
        }

        if (!fileName) {
          return errorResponse(req, 'Missing fileName', 400);
        }

        if (file.size > MAX_FILE_SIZE) {
          return errorResponse(req, 'File too large (max 20MB)', 400);
        }

        // Use custom path if provided (must be user-owned), otherwise generate one
        let filePath: string;
        if (customPath) {
          if (!isUserOwnedPath(customPath, userId)) {
            return forbiddenResponse(req, 'Custom path must be under your user directory');
          }
          filePath = customPath;
        } else {
          filePath = generateUserFilePath(userId, fileName);
        }

        console.log(`Uploading file to ${bucket} for user ${userId}: ${filePath}`);

        const { data, error } = await supabaseAdmin.storage
          .from(bucket)
          .upload(filePath, file, {
            contentType: file.type,
            upsert: false
          });

        if (error) {
          console.error('Upload error:', error);
          return errorResponse(req, error.message, 500);
        }

        return jsonResponse(req, { 
          success: true, 
          path: data.path,
          fullPath: data.fullPath
        });
      }

      case 'signed-url': {
        if (req.method !== 'POST') {
          return errorResponse(req, 'Method not allowed', 405);
        }

        const body = await req.json();
        const { path, expiresIn = 3600, bucket: bucketRaw } = body;

        let bucket: string;
        try {
          bucket = resolveBucket(bucketRaw ?? null);
        } catch (e) {
          return errorResponse(req, (e as Error).message, 400);
        }

        if (!path) {
          return errorResponse(req, 'Missing path', 400);
        }

        if (!isUserOwnedPath(path, userId)) {
          console.warn(`Access denied: User ${userId} attempted to access path: ${path}`);
          return forbiddenResponse(req, 'Access denied: path not owned by user');
        }

        const validExpiresIn = Math.min(Math.max(60, expiresIn), 604800);

        const { data, error } = await supabaseAdmin.storage
          .from(bucket)
          .createSignedUrl(path, validExpiresIn);

        if (error) {
          console.error('Signed URL error:', error);
          return errorResponse(req, error.message, 500);
        }

        return jsonResponse(req, { 
          success: true, 
          signedUrl: data.signedUrl 
        });
      }

      case 'delete': {
        if (req.method !== 'DELETE' && req.method !== 'POST') {
          return errorResponse(req, 'Method not allowed', 405);
        }

        const body = await req.json();
        const { paths, bucket: bucketRaw } = body;

        let bucket: string;
        try {
          bucket = resolveBucket(bucketRaw ?? null);
        } catch (e) {
          return errorResponse(req, (e as Error).message, 400);
        }

        if (!paths || !Array.isArray(paths) || paths.length === 0) {
          return errorResponse(req, 'Missing paths array', 400);
        }

        const invalidPaths = paths.filter((p: string) => !isUserOwnedPath(p, userId));
        if (invalidPaths.length > 0) {
          console.warn(`Access denied: User ${userId} attempted to delete paths not owned: ${invalidPaths.join(', ')}`);
          return forbiddenResponse(req, 'Access denied: some paths not owned by user');
        }

        console.log(`Deleting ${paths.length} files from ${bucket} for user ${userId}`);

        const { error } = await supabaseAdmin.storage
          .from(bucket)
          .remove(paths);

        if (error) {
          console.error('Delete error:', error);
          return errorResponse(req, error.message, 500);
        }

        return jsonResponse(req, { success: true });
      }

      default:
        return errorResponse(req, 'Invalid action. Use: upload, signed-url, or delete', 400);
    }
  } catch (error) {
    console.error('Storage proxy error:', error);
    return errorResponse(req, 'Internal server error', 500);
  }
});
