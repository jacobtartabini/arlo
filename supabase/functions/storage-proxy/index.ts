/**
 * Storage Proxy Edge Function
 * 
 * Proxies file uploads and downloads for the chat-attachments bucket
 * with Tailscale JWT authentication since we don't use Supabase Auth.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { 
  verifyArloJWT, 
  handleCorsOptions, 
  jsonResponse, 
  errorResponse, 
  unauthorizedResponse,
  getCorsHeaders
} from '../_shared/arloAuth.ts';

const BUCKET_NAME = 'chat-attachments';

// Initialize Supabase admin client with service role key
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

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

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  // Expected path: /storage-proxy/upload or /storage-proxy/download or /storage-proxy/delete
  // or /storage-proxy/signed-url
  const action = pathParts[pathParts.length - 1];

  try {
    switch (action) {
      case 'upload': {
        if (req.method !== 'POST') {
          return errorResponse(req, 'Method not allowed', 405);
        }

        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const filePath = formData.get('path') as string | null;

        if (!file || !filePath) {
          return errorResponse(req, 'Missing file or path', 400);
        }

        // Validate file size (20MB max)
        if (file.size > 20 * 1024 * 1024) {
          return errorResponse(req, 'File too large (max 20MB)', 400);
        }

        // Upload using admin client
        const { data, error } = await supabaseAdmin.storage
          .from(BUCKET_NAME)
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
        const { path, expiresIn = 3600 } = body;

        if (!path) {
          return errorResponse(req, 'Missing path', 400);
        }

        // Generate signed URL (valid for specified duration, default 1 hour)
        const { data, error } = await supabaseAdmin.storage
          .from(BUCKET_NAME)
          .createSignedUrl(path, expiresIn);

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
        const { paths } = body;

        if (!paths || !Array.isArray(paths) || paths.length === 0) {
          return errorResponse(req, 'Missing paths array', 400);
        }

        const { error } = await supabaseAdmin.storage
          .from(BUCKET_NAME)
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
