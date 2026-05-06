const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY;

export const SUPABASE_STATUS_TABLE =
  process.env.REACT_APP_SUPABASE_STATUS_TABLE || 'PFNA_Whse_Health_Status_Current_View';

export const SUPABASE_SITE_SERVERS_TABLE =
  process.env.REACT_APP_SUPABASE_SITE_SERVERS_TABLE || 'PFNA_Whse_Site_View';

function getSupabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Missing Supabase configuration. Check REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_PUBLISHABLE_KEY.');
  }

  return {
    url: SUPABASE_URL.replace(/\/$/, ''),
    key: SUPABASE_KEY
  };
}

export async function supabaseSelect(tableName, searchParams = new URLSearchParams()) {
  const { url, key } = getSupabaseConfig();
  const params = searchParams.toString();
  const endpoint = `${url}/rest/v1/${encodeURIComponent(tableName)}${params ? `?${params}` : ''}`;

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase request failed for ${tableName}: ${response.status} ${detail}`);
  }

  return response.json();
}
