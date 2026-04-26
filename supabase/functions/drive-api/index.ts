import { verifyArloJWT, handleCorsOptions, jsonResponse, unauthorizedResponse, errorResponse } from '../_shared/arloAuth.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encrypt, decrypt, isEncrypted } from '../_shared/encryption.ts';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_DRIVE_CLIENT_ID') || Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_DRIVE_CLIENT_SECRET') || Deno.env.get('GOOGLE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface DriveApiRequest {
  action: 'list_files' | 'search_files' | 'get_file' | 'sync_files' | 'link_file' | 'unlink_file' | 'get_links' | 'get_all_links' | 'get_file_links' | 'list_shared_drives';
  accountId?: string;
  query?: string;
  pageToken?: string;
  fileId?: string;
  driveFileId?: string;
  linkType?: 'project' | 'task' | 'trip' | 'event';
  linkedEntityId?: string;
  mimeType?: string;
  folderId?: string;
  driveFileIds?: string[];
  driveSection?: 'my_drive' | 'shared_with_me' | 'shared_drive';
  sharedDriveId?: string;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  owners?: Array<{ emailAddress: string; displayName: string }>;
  parents?: string[];
  starred?: boolean;
  trashed?: boolean;
  createdTime?: string;
  modifiedTime?: string;
  ownedByMe?: boolean;
  shared?: boolean;
  driveId?: string;
}

interface SharedDrive {
  id: string;
  name: string;
  colorRgb?: string;
  backgroundImageLink?: string;
}

function getSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// Custom error so callers can distinguish decryption issues from generic failures
class TokenDecryptionError extends Error {
  constructor(message = 'Token decryption failed - reconnection required') {
    super(message);
    this.name = 'TokenDecryptionError';
  }
}

async function safeDecrypt(value: string): Promise<string> {
  try {
    return isEncrypted(value) ? await decrypt(value) : value;
  } catch (err) {
    console.error('[drive-api] Decryption failed:', err);
    throw new TokenDecryptionError();
  }
}

async function markAccountNeedsReconnect(
  supabase: ReturnType<typeof getSupabaseClient>,
  accountId: string,
  reason = 'Stored Google Drive credentials could not be decrypted. Please reconnect this account.'
) {
  const payload = JSON.stringify({
    reason: 'auth_expired',
    message: reason,
    reconnectRequired: true,
    at: new Date().toISOString(),
  });
  await supabase.from('drive_accounts').update({ last_sync_error: payload }).eq('id', accountId);
}

// Get valid access token for an account
async function getValidAccessToken(supabase: ReturnType<typeof getSupabaseClient>, accountId: string, userKey: string): Promise<string | null> {
  const { data: account, error } = await supabase
    .from('drive_accounts')
    .select('*')
    .eq('id', accountId)
    .eq('user_key', userKey)
    .single();

  if (error || !account) {
    console.error('[drive-api] Account not found:', error);
    return null;
  }

  // Check if token is expired
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at) : new Date(0);
  const isExpired = expiresAt < new Date(Date.now() + 60000); // 1 minute buffer

  if (isExpired && account.refresh_token) {
    // Refresh the token — decrypt may fail if encryption key changed
    let decryptedRefresh: string;
    try {
      decryptedRefresh = await safeDecrypt(account.refresh_token);
    } catch {
      await markAccountNeedsReconnect(supabase, accountId);
      throw new TokenDecryptionError();
    }
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        refresh_token: decryptedRefresh,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      console.error('[drive-api] Token refresh failed:', await response.text());
      const payload = JSON.stringify({
        reason: 'auth_expired',
        message: 'Google Drive token refresh failed. Please reconnect this account.',
        reconnectRequired: true,
        upstreamStatus: response.status,
        at: new Date().toISOString(),
      });
      await supabase
        .from('drive_accounts')
        .update({ last_sync_error: payload })
        .eq('id', accountId);
      return null;
    }

    const tokens = await response.json();
    const encryptedAccess = await encrypt(tokens.access_token);
    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    await supabase
      .from('drive_accounts')
      .update({
        access_token: encryptedAccess,
        token_expires_at: newExpiresAt,
        last_sync_error: null,
      })
      .eq('id', accountId);

    return tokens.access_token;
  }

  // Decrypt and return current token (handle key mismatch gracefully)
  try {
    return await safeDecrypt(account.access_token);
  } catch {
    await markAccountNeedsReconnect(supabase, accountId);
    throw new TokenDecryptionError();
  }
}

// List files from Google Drive with section support
async function listDriveFiles(
  accessToken: string,
  options?: {
    query?: string;
    pageToken?: string;
    folderId?: string;
    mimeType?: string;
    driveSection?: 'my_drive' | 'shared_with_me' | 'shared_drive';
    sharedDriveId?: string;
  }
): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
  const { query, pageToken, folderId, mimeType, driveSection, sharedDriveId } = options || {};
  
  const params = new URLSearchParams({
    pageSize: '50',
    fields: 'nextPageToken,files(id,name,mimeType,size,thumbnailLink,webViewLink,webContentLink,iconLink,owners,parents,starred,trashed,createdTime,modifiedTime,ownedByMe,shared,driveId)',
    orderBy: 'folder,modifiedTime desc',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  });

  // Build query string
  const queryParts: string[] = ['trashed = false'];
  
  // Handle different sections
  if (driveSection === 'shared_with_me') {
    queryParts.push('sharedWithMe = true');
  } else if (driveSection === 'shared_drive' && sharedDriveId) {
    params.set('driveId', sharedDriveId);
    params.set('corpora', 'drive');
    if (!folderId) {
      queryParts.push(`'${sharedDriveId}' in parents`);
    }
  } else if (driveSection === 'my_drive' || !driveSection) {
    // My Drive: files I own or in my root
    if (!folderId && !query) {
      queryParts.push("'root' in parents");
    }
  }
  
  if (query) {
    queryParts.push(`name contains '${query.replace(/'/g, "\\'")}'`);
  }
  
  if (folderId) {
    queryParts.push(`'${folderId}' in parents`);
  }
  
  if (mimeType) {
    if (mimeType === 'folder') {
      queryParts.push("mimeType = 'application/vnd.google-apps.folder'");
    } else if (mimeType === 'document') {
      queryParts.push("(mimeType contains 'document' or mimeType contains 'text' or mimeType contains 'word')");
    } else if (mimeType === 'spreadsheet') {
      queryParts.push("(mimeType contains 'spreadsheet' or mimeType contains 'excel')");
    } else if (mimeType === 'presentation') {
      queryParts.push("(mimeType contains 'presentation' or mimeType contains 'powerpoint')");
    } else if (mimeType === 'image') {
      queryParts.push("mimeType contains 'image'");
    } else if (mimeType === 'pdf') {
      queryParts.push("mimeType = 'application/pdf'");
    } else if (mimeType === 'video') {
      queryParts.push("mimeType contains 'video'");
    }
  }

  params.set('q', queryParts.join(' and '));
  
  if (pageToken) {
    params.set('pageToken', pageToken);
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    console.error('[drive-api] Failed to list files:', await response.text());
    throw new Error('Failed to list files from Google Drive');
  }

  const data = await response.json();
  return { files: data.files || [], nextPageToken: data.nextPageToken };
}

// List shared drives
async function listSharedDrives(accessToken: string): Promise<SharedDrive[]> {
  const params = new URLSearchParams({
    pageSize: '100',
    fields: 'drives(id,name,colorRgb,backgroundImageLink)',
  });

  const response = await fetch(`https://www.googleapis.com/drive/v3/drives?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    console.error('[drive-api] Failed to list shared drives:', await response.text());
    return [];
  }

  const data = await response.json();
  return data.drives || [];
}

// Get file extension from mime type
function getFileExtension(mimeType: string, fileName: string): string {
  // First try to get from filename
  const match = fileName.match(/\.([^.]+)$/);
  if (match) return match[1].toLowerCase();

  // Map common mime types
  const mimeMap: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/vnd.google-apps.document': 'gdoc',
    'application/vnd.google-apps.spreadsheet': 'gsheet',
    'application/vnd.google-apps.presentation': 'gslide',
    'application/vnd.google-apps.folder': 'folder',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
  };

  return mimeMap[mimeType] || '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  try {
    const authResult = await verifyArloJWT(req);
    
    if (!authResult.authenticated || !authResult.userId) {
      return unauthorizedResponse(req, authResult.error || 'Authentication required');
    }

    const userKey = authResult.userId;
    const body: DriveApiRequest = await req.json();
    const { action, accountId } = body;

    console.log(`[drive-api] User ${userKey} action: ${action}`);

    const supabase = getSupabaseClient();

    switch (action) {
      case 'list_files':
      case 'search_files': {
        if (!accountId) {
          return errorResponse(req, 'Account ID is required', 400);
        }

        const accessToken = await getValidAccessToken(supabase, accountId, userKey);
        if (!accessToken) {
          return errorResponse(req, 'Invalid or expired account - please reconnect', 401);
        }

        const { files, nextPageToken } = await listDriveFiles(accessToken, {
          query: body.query,
          pageToken: body.pageToken,
          folderId: body.folderId,
          mimeType: body.mimeType,
          driveSection: body.driveSection,
          sharedDriveId: body.sharedDriveId,
        });

        // Get account info for the response
        const { data: account } = await supabase
          .from('drive_accounts_safe')
          .select('account_email, account_name')
          .eq('id', accountId)
          .single();

        // Transform files
        const transformedFiles = files.map(file => ({
          drive_file_id: file.id,
          name: file.name,
          mime_type: file.mimeType,
          file_extension: getFileExtension(file.mimeType, file.name),
          size_bytes: file.size ? parseInt(file.size) : null,
          thumbnail_url: file.thumbnailLink,
          web_view_link: file.webViewLink,
          web_content_link: file.webContentLink,
          icon_link: file.iconLink,
          owner_email: file.owners?.[0]?.emailAddress,
          owner_name: file.owners?.[0]?.displayName,
          is_folder: file.mimeType === 'application/vnd.google-apps.folder',
          parent_folder_id: file.parents?.[0],
          starred: file.starred,
          created_time: file.createdTime,
          modified_time: file.modifiedTime,
          account_email: account?.account_email,
          account_name: account?.account_name,
          owned_by_me: file.ownedByMe,
          shared: file.shared,
          drive_id: file.driveId,
        }));

        return jsonResponse(req, { 
          files: transformedFiles, 
          nextPageToken,
          accountId,
        });
      }

      case 'list_shared_drives': {
        if (!accountId) {
          return errorResponse(req, 'Account ID is required', 400);
        }

        const accessToken = await getValidAccessToken(supabase, accountId, userKey);
        if (!accessToken) {
          return errorResponse(req, 'Invalid or expired account - please reconnect', 401);
        }

        const sharedDrives = await listSharedDrives(accessToken);
        return jsonResponse(req, { sharedDrives });
      }

      case 'sync_files': {
        if (!accountId) {
          return errorResponse(req, 'Account ID is required', 400);
        }

        const accessToken = await getValidAccessToken(supabase, accountId, userKey);
        if (!accessToken) {
          return errorResponse(req, 'Invalid or expired account - please reconnect', 401);
        }

        // Fetch recent files (last 100)
        const { files } = await listDriveFiles(accessToken, {});

        // Upsert files to database
        const filesToUpsert = files.map(file => ({
          user_key: userKey,
          drive_account_id: accountId,
          drive_file_id: file.id,
          name: file.name,
          mime_type: file.mimeType,
          file_extension: getFileExtension(file.mimeType, file.name),
          size_bytes: file.size ? parseInt(file.size) : null,
          thumbnail_url: file.thumbnailLink,
          web_view_link: file.webViewLink,
          web_content_link: file.webContentLink,
          icon_link: file.iconLink,
          owner_email: file.owners?.[0]?.emailAddress,
          owner_name: file.owners?.[0]?.displayName,
          is_folder: file.mimeType === 'application/vnd.google-apps.folder',
          parent_folder_id: file.parents?.[0],
          starred: file.starred,
          trashed: file.trashed,
          created_time: file.createdTime,
          modified_time: file.modifiedTime,
          last_synced_at: new Date().toISOString(),
        }));

        if (filesToUpsert.length > 0) {
          const { error: upsertError } = await supabase
            .from('drive_files')
            .upsert(filesToUpsert, { onConflict: 'drive_account_id,drive_file_id' });

          if (upsertError) {
            console.error('[drive-api] Failed to sync files:', upsertError);
          }
        }

        // Update account last sync
        await supabase
          .from('drive_accounts')
          .update({ last_sync_at: new Date().toISOString(), last_sync_error: null })
          .eq('id', accountId);

        return jsonResponse(req, { synced: filesToUpsert.length });
      }

      case 'get_file': {
        const { fileId, driveFileId } = body;
        
        if (!fileId && !driveFileId) {
          return errorResponse(req, 'File ID is required', 400);
        }

        if (fileId) {
          // Get from database
          const { data: file, error } = await supabase
            .from('drive_files')
            .select('*, drive_accounts_safe!inner(account_email, account_name)')
            .eq('id', fileId)
            .eq('user_key', userKey)
            .single();

          if (error || !file) {
            return errorResponse(req, 'File not found', 404);
          }

          return jsonResponse(req, { file });
        }

        // Get from Google Drive directly
        if (!accountId) {
          return errorResponse(req, 'Account ID is required for Drive file lookup', 400);
        }

        const accessToken = await getValidAccessToken(supabase, accountId, userKey);
        if (!accessToken) {
          return errorResponse(req, 'Invalid or expired account', 401);
        }

        const response = await fetch(
          `https://www.googleapis.com/drive/v3/files/${driveFileId}?fields=id,name,mimeType,size,thumbnailLink,webViewLink,webContentLink,iconLink,owners,parents,starred,trashed,createdTime,modifiedTime`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!response.ok) {
          return errorResponse(req, 'File not found in Google Drive', 404);
        }

        const file = await response.json();
        return jsonResponse(req, { 
          file: {
            drive_file_id: file.id,
            name: file.name,
            mime_type: file.mimeType,
            size_bytes: file.size ? parseInt(file.size) : null,
            thumbnail_url: file.thumbnailLink,
            web_view_link: file.webViewLink,
            web_content_link: file.webContentLink,
            icon_link: file.iconLink,
            owner_email: file.owners?.[0]?.emailAddress,
            owner_name: file.owners?.[0]?.displayName,
            is_folder: file.mimeType === 'application/vnd.google-apps.folder',
            starred: file.starred,
            created_time: file.createdTime,
            modified_time: file.modifiedTime,
          }
        });
      }

      case 'link_file': {
        const { driveFileId, linkType, linkedEntityId } = body;
        
        if (!accountId || !driveFileId || !linkType || !linkedEntityId) {
          return errorResponse(req, 'accountId, driveFileId, linkType, and linkedEntityId are required', 400);
        }

        // First, ensure file exists in our database
        let { data: existingFile } = await supabase
          .from('drive_files')
          .select('id')
          .eq('drive_account_id', accountId)
          .eq('drive_file_id', driveFileId)
          .single();

        if (!existingFile) {
          // Fetch and cache the file
          const accessToken = await getValidAccessToken(supabase, accountId, userKey);
          if (!accessToken) {
            return errorResponse(req, 'Invalid or expired account', 401);
          }

          const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${driveFileId}?fields=id,name,mimeType,size,thumbnailLink,webViewLink,webContentLink,iconLink,owners,parents,starred,createdTime,modifiedTime`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );

          if (!response.ok) {
            return errorResponse(req, 'File not found in Google Drive', 404);
          }

          const file = await response.json();

          const { data: newFile, error: insertError } = await supabase
            .from('drive_files')
            .insert({
              user_key: userKey,
              drive_account_id: accountId,
              drive_file_id: file.id,
              name: file.name,
              mime_type: file.mimeType,
              file_extension: getFileExtension(file.mimeType, file.name),
              size_bytes: file.size ? parseInt(file.size) : null,
              thumbnail_url: file.thumbnailLink,
              web_view_link: file.webViewLink,
              web_content_link: file.webContentLink,
              icon_link: file.iconLink,
              owner_email: file.owners?.[0]?.emailAddress,
              owner_name: file.owners?.[0]?.displayName,
              is_folder: file.mimeType === 'application/vnd.google-apps.folder',
              parent_folder_id: file.parents?.[0],
              starred: file.starred,
              created_time: file.createdTime,
              modified_time: file.modifiedTime,
            })
            .select('id')
            .single();

          if (insertError || !newFile) {
            console.error('[drive-api] Failed to cache file:', insertError);
            return errorResponse(req, 'Failed to cache file', 500);
          }

          existingFile = newFile;
        }

        // Create the link
        const { error: linkError } = await supabase
          .from('drive_file_links')
          .insert({
            user_key: userKey,
            drive_file_id: existingFile.id,
            link_type: linkType,
            linked_entity_id: linkedEntityId,
          });

        if (linkError) {
          console.error('[drive-api] Failed to create link:', linkError);
          return errorResponse(req, 'Failed to link file', 500);
        }

        return jsonResponse(req, { success: true });
      }

      case 'unlink_file': {
        const { fileId, linkType, linkedEntityId } = body;
        
        if (!fileId || !linkType || !linkedEntityId) {
          return errorResponse(req, 'fileId, linkType, and linkedEntityId are required', 400);
        }

        const { error } = await supabase
          .from('drive_file_links')
          .delete()
          .eq('drive_file_id', fileId)
          .eq('link_type', linkType)
          .eq('linked_entity_id', linkedEntityId)
          .eq('user_key', userKey);

        if (error) {
          console.error('[drive-api] Failed to unlink file:', error);
          return errorResponse(req, 'Failed to unlink file', 500);
        }

        return jsonResponse(req, { success: true });
      }

      case 'get_links': {
        const { linkType, linkedEntityId } = body;
        
        if (!linkType || !linkedEntityId) {
          return errorResponse(req, 'linkType and linkedEntityId are required', 400);
        }

        const { data: links, error } = await supabase
          .from('drive_file_links')
          .select(`
            id,
            notes,
            created_at,
            drive_files!inner(
              id,
              name,
              mime_type,
              file_extension,
              size_bytes,
              thumbnail_url,
              web_view_link,
              icon_link,
              modified_time,
              drive_accounts!inner(account_email)
            )
          `)
          .eq('link_type', linkType)
          .eq('linked_entity_id', linkedEntityId)
          .eq('user_key', userKey);

        if (error) {
          console.error('[drive-api] Failed to get links:', error);
          return errorResponse(req, 'Failed to get file links', 500);
        }

        return jsonResponse(req, { links: links || [] });
      }

      case 'get_all_links': {
        // Get all file links for a user (to display in /files)
        const { data: links, error } = await supabase
          .from('drive_file_links')
          .select(`
            id,
            link_type,
            linked_entity_id,
            drive_file_id,
            created_at
          `)
          .eq('user_key', userKey);

        if (error) {
          console.error('[drive-api] Failed to get all links:', error);
          return errorResponse(req, 'Failed to get file links', 500);
        }

        return jsonResponse(req, { links: links || [] });
      }

      case 'get_file_links': {
        // Get links for specific files by their drive_file_id
        const { driveFileIds } = body;
        
        if (!driveFileIds || driveFileIds.length === 0) {
          return jsonResponse(req, { links: [] });
        }

        // First get the internal file IDs
        const { data: files } = await supabase
          .from('drive_files')
          .select('id, drive_file_id')
          .eq('user_key', userKey)
          .in('drive_file_id', driveFileIds);

        if (!files || files.length === 0) {
          return jsonResponse(req, { links: [] });
        }

        const fileIdMap = new Map(files.map(f => [f.id, f.drive_file_id]));
        const internalIds = files.map(f => f.id);

        // Get links for these files
        const { data: links, error } = await supabase
          .from('drive_file_links')
          .select(`
            id,
            link_type,
            linked_entity_id,
            drive_file_id
          `)
          .eq('user_key', userKey)
          .in('drive_file_id', internalIds);

        if (error) {
          console.error('[drive-api] Failed to get file links:', error);
          return errorResponse(req, 'Failed to get file links', 500);
        }

        // Map back to drive_file_id for the frontend
        const mappedLinks = (links || []).map(link => ({
          ...link,
          drive_file_id_external: fileIdMap.get(link.drive_file_id),
        }));

        return jsonResponse(req, { links: mappedLinks });
      }

      default:
        return errorResponse(req, `Unknown action: ${action}`, 400);
    }

  } catch (err) {
    console.error('[drive-api] Error:', err);
    return errorResponse(req, err instanceof Error ? err.message : 'Internal error', 500);
  }
});
