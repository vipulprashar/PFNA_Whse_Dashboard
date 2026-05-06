import { supabaseSelect, SUPABASE_SITE_SERVERS_TABLE } from './supabaseClient';

export async function fetchSiteServers(siteAbbr, siteEnv) {
  const params = new URLSearchParams({
    select: '*',
    site_abbr: `eq.${siteAbbr}`,
    site_env: `eq.${siteEnv}`,
    order: 'app_nm.asc,app_server_type.asc,app_server_node_nm.asc'
  });

  const rows = await supabaseSelect(SUPABASE_SITE_SERVERS_TABLE, params);

  return rows.reduce(
    (acc, row) => {
      const appName = row.app_nm || 'Unknown';

      if (!acc.servers_by_app[appName]) {
        acc.servers_by_app[appName] = [];
      }

      acc.servers_by_app[appName].push({
        server_type: row.app_server_type,
        server_name: row.app_server_node_nm,
        server_ip: row.app_server_ip
      });
      return acc;
    },
    {
      site: rows[0]
        ? {
            loc_ctry_code: rows[0].loc_ctry_code,
            loc_co_code: rows[0].loc_co_code,
            loc_nbr: rows[0].loc_nbr,
            wave_nbr: rows[0].wave_nbr,
            site_abbr: rows[0].site_abbr,
            site_type: rows[0].site_type,
            site_env: rows[0].site_env,
            site_full_nm: rows[0].site_full_nm,
            site_deployment_status: rows[0].site_deployment_status,
            site_support_group: rows[0].site_support_group
          }
        : null,
      servers_by_app: {}
    }
  );
}
