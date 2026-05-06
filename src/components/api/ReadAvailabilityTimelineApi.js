const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const API_KEY = process.env.REACT_APP_API_KEY;

export async function fetchAvailabilityTimeline(siteAbbr, availabilityHours) {
  const response = await fetch(
    `${API_BASE_URL}/api/getProcessAvailabilityTimelineByApp?site_abbr=${encodeURIComponent(siteAbbr)}&hours=${availabilityHours}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': API_KEY
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch availability timeline: ${response.status}`);
  }

  return response.json();
}