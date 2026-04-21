import { verifyArloJWT, handleCorsOptions, jsonResponse, unauthorizedResponse, errorResponse } from '../_shared/arloAuth.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decrypt, isEncrypted, encrypt } from '../_shared/encryption.ts';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_DRIVE_CLIENT_ID') || Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_DRIVE_CLIENT_SECRET') || Deno.env.get('GOOGLE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface WorkspaceApiRequest {
  action: 'get_doc' | 'update_doc' | 'get_sheet' | 'update_sheet' | 'get_slides' | 'update_slides';
  accountId: string;
  fileId: string; // Google Drive file ID
  content?: DocumentContent | SheetContent | SlidesContent;
}

interface DocumentContent {
  title?: string;
  body?: DocumentBody;
}

interface DocumentBody {
  content: DocumentElement[];
}

interface DocumentElement {
  startIndex?: number;
  endIndex?: number;
  paragraph?: {
    elements: ParagraphElement[];
    paragraphStyle?: {
      namedStyleType?: string;
      alignment?: string;
    };
  };
  table?: {
    rows: number;
    columns: number;
    tableRows: TableRow[];
  };
  sectionBreak?: object;
}

interface ParagraphElement {
  startIndex?: number;
  endIndex?: number;
  textRun?: {
    content: string;
    textStyle?: {
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      fontSize?: { magnitude: number; unit: string };
      foregroundColor?: { color: { rgbColor: { red?: number; green?: number; blue?: number } } };
    };
  };
}

interface TableRow {
  tableCells: TableCell[];
}

interface TableCell {
  content: DocumentElement[];
}

interface SheetContent {
  sheets: SheetData[];
}

interface SheetData {
  properties: {
    sheetId: number;
    title: string;
    index: number;
  };
  data?: GridData[];
}

interface GridData {
  rowData?: RowData[];
  startRow?: number;
  startColumn?: number;
}

interface RowData {
  values?: CellData[];
}

interface CellData {
  userEnteredValue?: {
    stringValue?: string;
    numberValue?: number;
    boolValue?: boolean;
    formulaValue?: string;
  };
  formattedValue?: string;
  effectiveFormat?: {
    backgroundColor?: { red?: number; green?: number; blue?: number };
    textFormat?: {
      bold?: boolean;
      italic?: boolean;
      fontSize?: number;
    };
  };
}

interface SlidesContent {
  slides: SlideData[];
  title?: string;
}

interface SlideData {
  objectId: string;
  pageElements: PageElement[];
}

interface PageElement {
  objectId: string;
  size?: { width: Dimension; height: Dimension };
  transform?: { scaleX: number; scaleY: number; translateX: number; translateY: number };
  shape?: {
    shapeType: string;
    text?: TextContent;
  };
  image?: {
    contentUrl: string;
    sourceUrl?: string;
  };
  table?: {
    rows: number;
    columns: number;
  };
}

interface Dimension {
  magnitude: number;
  unit: string;
}

interface TextContent {
  textElements: TextElement[];
}

interface TextElement {
  startIndex?: number;
  endIndex?: number;
  textRun?: {
    content: string;
    style?: {
      bold?: boolean;
      italic?: boolean;
      fontSize?: { magnitude: number; unit: string };
    };
  };
  paragraphMarker?: {
    style?: {
      alignment?: string;
    };
  };
}

function getSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

async function getValidAccessToken(supabase: ReturnType<typeof getSupabaseClient>, accountId: string, userKey: string): Promise<string | null> {
  const { data: account, error } = await supabase
    .from('drive_accounts')
    .select('*')
    .eq('id', accountId)
    .eq('user_key', userKey)
    .single();

  if (error || !account) {
    console.error('[workspace-api] Account not found:', error);
    return null;
  }

  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at) : new Date(0);
  const isExpired = expiresAt < new Date(Date.now() + 60000);

  if (isExpired && account.refresh_token) {
    const decryptedRefresh = isEncrypted(account.refresh_token) ? await decrypt(account.refresh_token) : account.refresh_token;
    
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
      console.error('[workspace-api] Token refresh failed:', await response.text());
      const payload = JSON.stringify({
        reason: 'auth_expired',
        message: 'Google Workspace token refresh failed. Please reconnect this account.',
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

  return isEncrypted(account.access_token) ? await decrypt(account.access_token) : account.access_token;
}

// Google Docs API functions
async function getDocument(accessToken: string, fileId: string) {
  const response = await fetch(`https://docs.googleapis.com/v1/documents/${fileId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('[workspace-api] Failed to get document:', errText);
    throw new Error(`Failed to get document: ${response.status}`);
  }

  return await response.json();
}

async function updateDocument(accessToken: string, fileId: string, requests: object[]) {
  const response = await fetch(`https://docs.googleapis.com/v1/documents/${fileId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('[workspace-api] Failed to update document:', errText);
    throw new Error(`Failed to update document: ${response.status}`);
  }

  return await response.json();
}

// Google Sheets API functions
async function getSpreadsheet(accessToken: string, fileId: string) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${fileId}?includeGridData=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error('[workspace-api] Failed to get spreadsheet:', errText);
    throw new Error(`Failed to get spreadsheet: ${response.status}`);
  }

  return await response.json();
}

async function updateSpreadsheet(accessToken: string, fileId: string, requests: object[]) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${fileId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('[workspace-api] Failed to update spreadsheet:', errText);
    throw new Error(`Failed to update spreadsheet: ${response.status}`);
  }

  return await response.json();
}

async function updateCellValues(accessToken: string, fileId: string, range: string, values: (string | number | boolean)[][]) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${fileId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error('[workspace-api] Failed to update cell values:', errText);
    throw new Error(`Failed to update cell values: ${response.status}`);
  }

  return await response.json();
}

// Google Slides API functions
async function getPresentation(accessToken: string, fileId: string) {
  const response = await fetch(`https://slides.googleapis.com/v1/presentations/${fileId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('[workspace-api] Failed to get presentation:', errText);
    throw new Error(`Failed to get presentation: ${response.status}`);
  }

  return await response.json();
}

async function updatePresentation(accessToken: string, fileId: string, requests: object[]) {
  const response = await fetch(`https://slides.googleapis.com/v1/presentations/${fileId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('[workspace-api] Failed to update presentation:', errText);
    throw new Error(`Failed to update presentation: ${response.status}`);
  }

  return await response.json();
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
    const body: WorkspaceApiRequest = await req.json();
    const { action, accountId, fileId, content } = body;

    if (!accountId || !fileId) {
      return errorResponse(req, 'accountId and fileId are required', 400);
    }

    console.log(`[workspace-api] User ${userKey} action: ${action} on file: ${fileId}`);

    const supabase = getSupabaseClient();
    const accessToken = await getValidAccessToken(supabase, accountId, userKey);
    
    if (!accessToken) {
      return errorResponse(req, 'Invalid or expired account - please reconnect', 401);
    }

    switch (action) {
      case 'get_doc': {
        const doc = await getDocument(accessToken, fileId);
        return jsonResponse(req, { document: doc });
      }

      case 'update_doc': {
        if (!content) {
          return errorResponse(req, 'content is required for update_doc', 400);
        }
        
        // Build update requests from content
        const requests: object[] = [];
        const docContent = content as { requests?: object[] };
        
        if (docContent.requests) {
          requests.push(...docContent.requests);
        }

        if (requests.length === 0) {
          return errorResponse(req, 'No update requests provided', 400);
        }

        const result = await updateDocument(accessToken, fileId, requests);
        return jsonResponse(req, { result });
      }

      case 'get_sheet': {
        const spreadsheet = await getSpreadsheet(accessToken, fileId);
        return jsonResponse(req, { spreadsheet });
      }

      case 'update_sheet': {
        if (!content) {
          return errorResponse(req, 'content is required for update_sheet', 400);
        }
        
        const sheetContent = content as { range?: string; values?: (string | number | boolean)[][]; requests?: object[] };
        
        // Handle cell value updates
        if (sheetContent.range && sheetContent.values) {
          const result = await updateCellValues(accessToken, fileId, sheetContent.range, sheetContent.values);
          return jsonResponse(req, { result });
        }
        
        // Handle batch updates
        if (sheetContent.requests && sheetContent.requests.length > 0) {
          const result = await updateSpreadsheet(accessToken, fileId, sheetContent.requests);
          return jsonResponse(req, { result });
        }

        return errorResponse(req, 'Either range+values or requests must be provided', 400);
      }

      case 'get_slides': {
        const presentation = await getPresentation(accessToken, fileId);
        return jsonResponse(req, { presentation });
      }

      case 'update_slides': {
        if (!content) {
          return errorResponse(req, 'content is required for update_slides', 400);
        }
        
        const slidesContent = content as { requests?: object[] };
        
        if (!slidesContent.requests || slidesContent.requests.length === 0) {
          return errorResponse(req, 'No update requests provided', 400);
        }

        const result = await updatePresentation(accessToken, fileId, slidesContent.requests);
        return jsonResponse(req, { result });
      }

      default:
        return errorResponse(req, `Unknown action: ${action}`, 400);
    }

  } catch (err) {
    console.error('[workspace-api] Error:', err);
    return errorResponse(req, err instanceof Error ? err.message : 'Internal error', 500);
  }
});
