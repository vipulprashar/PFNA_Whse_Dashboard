const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const API_KEY = process.env.REACT_APP_API_KEY;

export const fetchAvailabilityProcessDrilldown = async (
  siteAbbr,
  appName,
  snapshotTime
) => {
  const params = new URLSearchParams({
    site_abbr: siteAbbr,
    app_nm: appName,
    snapshot_time: snapshotTime
  });

  const response = await fetch(
    `${API_BASE_URL}/api/getAvailabilityProcessDrilldown?${params.toString()}`,
    {
      headers: {
        'X-API-KEY': API_KEY
      }
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch availability process drilldown');
  }

  return response.json();
};