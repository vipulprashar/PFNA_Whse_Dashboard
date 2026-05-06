import { supabaseSelect, SUPABASE_STATUS_TABLE } from './supabaseClient';

export async function fetchWhseDashboardData() {
  try {
    const params = new URLSearchParams({
      select: '*',
      order: 'site_abbr.asc,site_env.asc,app_nm.asc,app_prc_priority.asc,app_prc_nm.asc'
    });

    return await supabaseSelect(SUPABASE_STATUS_TABLE, params);
  } catch (error) {
    console.error('Error fetching site_master data:', error);
    return [];
  }
}
