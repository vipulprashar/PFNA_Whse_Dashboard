import { supabaseSelect, SUPABASE_SITE_SERVERS_TABLE } from './supabaseClient';

export async function fetchSiteServers(siteAbbr, siteEnv) {
  const params = new URLSearchParams({
    select: '*',
    site_abbr: `eq.${siteAbbr}`,
    site_env: `eq.${siteEnv}`,
    order: 'app_nm.asc,server_type.asc,server_name.asc'
  });

  const rows = await supabaseSelect(SUPABASE_SITE_SERVERS_TABLE, params);

  return rows.reduce(
    (acc, row) => {
      const appName = row.app_nm || 'Unknown';

      if (!acc.servers_by_app[appName]) {
        acc.servers_by_app[appName] = [];
      }

      acc.servers_by_app[appName].push(row);
      return acc;
    },
    { servers_by_app: {} }
  );
}
