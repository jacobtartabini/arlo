import {
  verifyArloJWT,
  handleCorsOptions,
  validateOrigin,
  jsonResponse,
  unauthorizedResponse,
  errorResponse,
} from '../_shared/arloAuth.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decrypt, encrypt, isEncrypted } from '../_shared/encryption.ts';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_DRIVE_CLIENT_ID') || Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_DRIVE_CLIENT_SECRET') || Deno.env.get('GOOGLE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface ImportRequest {
  drive_account_id: string;
}

function getSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

async function getValidAccessToken(
  supabase: ReturnType<typeof getSupabaseClient>,
  accountId: string,
  userKey: string,
): Promise<string | null> {
  const { data: account, error } = await supabase
    .from('drive_accounts')
    .select('*')
    .eq('id', accountId)
    .eq('user_key', userKey)
    .single();

  if (error || !account) {
    console.error('[google-contacts-import] Account not found:', error);
    return null;
  }

  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at) : new Date(0);
  const isExpired = expiresAt < new Date(Date.now() + 60000);

  if (isExpired && account.refresh_token) {
    const decryptedRefresh = isEncrypted(account.refresh_token)
      ? await decrypt(account.refresh_token)
      : account.refresh_token;

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
      console.error('[google-contacts-import] Token refresh failed:', await response.text());
      return null;
    }

    const tokens = await response.json();
    const encryptedAccess = await encrypt(tokens.access_token);
    const newExpiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();

    await supabase
      .from('drive_accounts')
      .update({
        access_token: encryptedAccess,
        token_expires_at: newExpiresAt,
        last_sync_error: null,
      })
      .eq('id', accountId);

    return tokens.access_token as string;
  }

  return isEncrypted(account.access_token) ? await decrypt(account.access_token) : account.access_token;
}

function pickLinkedInUrl(urls: Array<{ value?: string; type?: string }> | undefined): string | null {
  if (!urls?.length) return null;
  const linkedin = urls.find((u) => (u.value || '').includes('linkedin.com'));
  return linkedin?.value?.trim() || null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  const originError = validateOrigin(req);
  if (originError) return originError;

  try {
    const authResult = await verifyArloJWT(req);
    if (!authResult.authenticated || !authResult.userId) {
      return unauthorizedResponse(req, authResult.error || 'Authentication required');
    }

    const userKey = authResult.userId;
    const body = (await req.json()) as ImportRequest;
    const driveAccountId = body.drive_account_id;

    if (!driveAccountId || typeof driveAccountId !== 'string') {
      return errorResponse(req, 'drive_account_id is required', 400);
    }

    const supabase = getSupabaseClient();
    const accessToken = await getValidAccessToken(supabase, driveAccountId, userKey);
    if (!accessToken) {
      return errorResponse(req, 'Unable to read Google account tokens. Reconnect Google in Settings.', 401);
    }

    const personFields = [
      'names',
      'emailAddresses',
      'phoneNumbers',
      'organizations',
      'photos',
      'urls',
      'metadata',
    ].join(',');

    const collected: Record<string, unknown>[] = [];
    let pageToken: string | undefined;

    do {
      const url = new URL('https://people.googleapis.com/v1/people/me/connections');
      url.searchParams.set('pageSize', '500');
      url.searchParams.set('personFields', personFields);
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('[google-contacts-import] People API error:', res.status, text);
        if (res.status === 403 && text.includes('insufficient')) {
          return jsonResponse(req, {
            error:
              'Google Contacts permission missing. Open Settings → Google Drive, disconnect and reconnect so Arlo can request Contacts access.',
            code: 'missing_contacts_scope',
          }, 403);
        }
        return errorResponse(req, 'Google People API request failed', res.status);
      }

      const data = (await res.json()) as {
        connections?: Record<string, unknown>[];
        nextPageToken?: string;
      };

      if (Array.isArray(data.connections)) {
        collected.push(...data.connections);
      }
      pageToken = data.nextPageToken;
    } while (pageToken);

    const contacts = collected.map((person) => {
      const resourceName = typeof (person as { resourceName?: string }).resourceName === 'string'
        ? (person as { resourceName: string }).resourceName
        : null;

      const names = person.names as Array<{ displayName?: string; givenName?: string; familyName?: string }> | undefined;
      const displayName = names?.[0]?.displayName?.trim() || 'Unknown';
      const givenName = names?.[0]?.givenName || null;
      const familyName = names?.[0]?.familyName || null;

      const emails = (person.emailAddresses as Array<{ value?: string }> | undefined)
        ?.map((e) => e.value?.trim())
        .filter((v): v is string => !!v) || [];

      const phones = (person.phoneNumbers as Array<{ value?: string }> | undefined)
        ?.map((p) => p.value?.trim())
        .filter((v): v is string => !!v) || [];

      const orgs = person.organizations as Array<{ name?: string; title?: string }> | undefined;
      const company = orgs?.[0]?.name || null;
      const jobTitle = orgs?.[0]?.title || null;

      const photos = person.photos as Array<{ url?: string }> | undefined;
      const photoUrl = photos?.[0]?.url || null;

      const urls = person.urls as Array<{ value?: string }> | undefined;
      const linkedinUrl = pickLinkedInUrl(urls);

      const externalId = resourceName;

      return {
        source: 'google' as const,
        external_id: externalId,
        display_name: displayName,
        given_name: givenName,
        family_name: familyName,
        emails,
        phones,
        company,
        job_title: jobTitle,
        linkedin_url: linkedinUrl,
        photo_url: photoUrl,
      };
    });

    console.log(`[google-contacts-import] Returning ${contacts.length} contacts for user ${userKey}`);
    return jsonResponse(req, { contacts, count: contacts.length });
  } catch (err) {
    console.error('[google-contacts-import]', err);
    return errorResponse(req, err instanceof Error ? err.message : 'Unexpected error', 500);
  }
});
