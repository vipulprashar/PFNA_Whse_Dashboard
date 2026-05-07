import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const SUPABASE_STATUS_TABLE =
  process.env.NEXT_PUBLIC_SUPABASE_STATUS_TABLE || 'PFNA_Whse_Health_Status_Current_View';

export const SUPABASE_SITE_SERVERS_TABLE =
  process.env.NEXT_PUBLIC_SUPABASE_SITE_SERVERS_TABLE || 'PFNA_Whse_Site_View';

function getSupabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Missing Supabase configuration. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
  }

  return {
    url: SUPABASE_URL.replace(/\/$/, ''),
    key: SUPABASE_KEY
  };
}

const { url, key } = getSupabaseConfig();
const SUPABASE_PAGE_SIZE = 1000;

export const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true
  }
});

export async function supabaseSelect(tableName, searchParams = new URLSearchParams()) {
  const {
    data: { session }
  } = await supabase.auth.getSession();
  const params = searchParams.toString();
  const endpoint = `${url}/rest/v1/${encodeURIComponent(tableName)}${params ? `?${params}` : ''}`;
  const authorizationToken = session?.access_token || key;
  const rows = [];
  let rangeStart = 0;

  while (true) {
    const rangeEnd = rangeStart + SUPABASE_PAGE_SIZE - 1;
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: key,
        Authorization: `Bearer ${authorizationToken}`,
        Accept: 'application/json',
        'Range-Unit': 'items',
        Range: `${rangeStart}-${rangeEnd}`
      }
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Supabase request failed for ${tableName}: ${response.status} ${detail}`);
    }

    const pageRows = await response.json();
    rows.push(...pageRows);

    const contentRange = response.headers.get('content-range');
    const rangeMatch = contentRange?.match(/^(\d+)-(\d+)\/(?:(\d+)|\*)$/);

    if (rangeMatch) {
      const returnedEnd = Number(rangeMatch[2]);
      const totalRows = rangeMatch[3] ? Number(rangeMatch[3]) : null;
      const nextStart = returnedEnd + 1;

      if (pageRows.length === 0 || (totalRows !== null && nextStart >= totalRows)) {
        break;
      }

      rangeStart = nextStart;
      continue;
    }

    if (pageRows.length < SUPABASE_PAGE_SIZE) {
      break;
    }

    rangeStart += SUPABASE_PAGE_SIZE;
  }

  return rows;
}
