import { supabaseSelect, SUPABASE_SITE_SERVERS_TABLE } from './supabaseClient';
import { PWM_APP_NAMES } from '../Constants';

const getNormalizedAppName = (appName) => (
  PWM_APP_NAMES.includes(appName) ? 'PWM' : appName
);

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
      const appName = getNormalizedAppName(row.app_nm) || 'Unknown';
      const serverType = row.app_server_type || row.server_type;
      const serverName = row.app_server_node_nm || row.server_name;
      const serverIp = row.app_server_ip || row.server_ip;

      if (!acc.servers_by_app[appName]) {
        acc.servers_by_app[appName] = [];
      }

      acc.servers_by_app[appName].push({
        server_type: serverType,
        server_name: serverName,
        server_ip: serverIp
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
