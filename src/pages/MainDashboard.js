import React, { useCallback, useEffect, useMemo, useState, useDeferredValue } from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  TextField,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Skeleton,
  Stack,
  Autocomplete
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SiteCard from '../components/SiteCard';
import { fetchWhseDashboardData } from '../components/api/ReadSitesApi';
import { PWM_APP_NAMES } from '../components/Constants';
import SiteDetailsDrawer from '../components/SiteDetailsDrawer';

const pgtLogo = '/PGT_Logo.png';

function MainDashboard({ refreshKey, setIsDetailsOpen }) {
  const [sites, setSites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedSites, setSelectedSites] = useState([]);
  const [siteSearchInput, setSiteSearchInput] = useState('');
  const [debouncedSiteSearchInput, setDebouncedSiteSearchInput] = useState('');

  const [selectedSiteTypes, setSelectedSiteTypes] = useState([]);
  const [selectedAppVersions, setSelectedAppVersions] = useState([]);

  const [detailsSiteGroup, setDetailsSiteGroup] = useState(null);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);

  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  const [summaryFilter, setSummaryFilter] = useState('ALL');

  const deferredSelectedSiteTypes = useDeferredValue(selectedSiteTypes);
  //const deferredSelectedWaveNbrs = useDeferredValue(selectedWaveNbrs);
  const deferredSelectedAppVersions = useDeferredValue(selectedAppVersions);

  const dashboardView = 'status';

  const normalizeAndGroupData = useCallback((data) => {
    const normalized = data.map(item => ({
      ...item,
      app_nm: PWM_APP_NAMES.includes(item.app_nm) ? 'PWM' : item.app_nm
    }));

    const grouped = normalized.reduce((acc, item) => {
      const key = `${item.site_abbr}-${item.site_env}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {});

    return Object.values(grouped);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchWhseDashboardData();
      setSites(normalizeAndGroupData(data));
      setLastRefreshTime(new Date());
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [normalizeAndGroupData]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  // useEffect(() => {
  //   setSelectedSites([]);
  //   setSiteSearchInput('');
  //   setDebouncedSiteSearchInput('');
  //   setSelectedSiteTypes([]);
  //   setSelectedWaveNbrs([]);
  //   setDetailsSiteGroup(null);
  //   setIsDetailsDrawerOpen(false);
  //   setSummaryFilter('ALL');
  // }, [activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSiteSearchInput(siteSearchInput);
    }, 250);

    return () => clearTimeout(timer);
  }, [siteSearchInput]);

  useEffect(() => {
    setIsDetailsOpen(isDetailsDrawerOpen);
  }, [isDetailsDrawerOpen, setIsDetailsOpen]);

  const processedSites = useMemo(() => {
  const getOverallStatus = (siteGroup) => {
    const criticalDown = siteGroup.some(
      row => row.app_prc_priority === '1' && row.app_prc_stat === 'DOWN'
    );
    if (criticalDown) return 'DOWN';

    const nonCriticalDownCount = siteGroup.filter(
      row => row.app_prc_stat === 'DOWN' && row.app_prc_priority !== '1'
    ).length;

    if (nonCriticalDownCount >= 5) return 'WARNING';
    if (nonCriticalDownCount >= 1) return 'MINOR';

    return 'UP';
  };

    return sites.map(siteGroup => {
      const site = siteGroup[0];
      const siteKey = `${site.site_abbr}-${site.site_env}`;
      const optionLabel = `${site.wave_nbr || ''}-${site.loc_nbr || ''}-${site.site_abbr || ''}-${site.site_full_nm || ''}`;

      const versions = Array.from(
        new Map(
          siteGroup
            .filter(row => row.app_nm && row.max_app_version)
            .map(row => {
              const appName = PWM_APP_NAMES.includes(row.app_nm) ? 'PWM' : row.app_nm;

              return [
                `${appName}::${row.max_app_version}`,
                {
                  app: appName,
                  version: row.max_app_version,
                  label: `${appName} • ${row.max_app_version}`
                }
              ];
            })
        ).values()
      );

      return {
        siteGroup,
        site,
        siteKey,
        overallStatus: getOverallStatus(siteGroup),
        optionLabel,
        searchText: optionLabel.toLowerCase(),
        versions
      };
    });
  }, [sites]);

  const siteSearchOptions = useMemo(() => {
    const typed = debouncedSiteSearchInput.trim().toLowerCase();

    if (!typed) return processedSites;

    return processedSites.filter(({ optionLabel }) =>
      optionLabel.toLowerCase().includes(typed)
    );
  }, [processedSites, debouncedSiteSearchInput]);

  const filteredSites = useMemo(() => {
    const selectedSiteKeys = new Set(selectedSites.map(item => item.siteKey));
    //const selectedWaveSet = new Set(deferredSelectedWaveNbrs.map(String));
    const selectedVersionSet = new Set(
    deferredSelectedAppVersions.map(item => `${item.app}::${item.version}`)
    );
    const typedSearch = debouncedSiteSearchInput.trim().toLowerCase();
    const order = { DOWN: 0, WARNING: 1, MINOR: 2, UP: 3 };

    return processedSites
      .filter(({ site, siteKey, overallStatus, searchText, versions }) => {
        const matchesSummary =
          summaryFilter === 'ALL' || overallStatus === summaryFilter;

        const matchesSelectedSites =
          selectedSites.length === 0 || selectedSiteKeys.has(siteKey);

        const matchesTypedSearch =
          typedSearch === '' || searchText.includes(typedSearch);

        const matchesSiteType =
          deferredSelectedSiteTypes.length === 0 ||
          deferredSelectedSiteTypes.includes(site.site_type);

        // const matchesWave =
        //   deferredSelectedWaveNbrs.length === 0 ||
        //   selectedWaveSet.has(String(site.wave_nbr));
        const matchesVersion =
          deferredSelectedAppVersions.length === 0 ||
          versions.some(v => selectedVersionSet.has(`${v.app}::${v.version}`));

        return (
          matchesSummary &&
          matchesSelectedSites &&
          matchesTypedSearch &&
          matchesSiteType &&
          matchesVersion
        );
      })
      .sort((a, b) => order[a.overallStatus] - order[b.overallStatus])
      .map(item => item.siteGroup);
  }, [
    processedSites,
    summaryFilter,
    selectedSites,
    debouncedSiteSearchInput,
    deferredSelectedSiteTypes,
    deferredSelectedAppVersions
  ]);

  const siteTypeOptions = useMemo(() => {
    return [...new Set(
      processedSites
        .map(({ site }) => site.site_type)
        .filter(Boolean)
    )].sort();
  }, [processedSites]);

  // const appVersionOptions = useMemo(() => {
  //   return Array.from(
  //     new Map(
  //       processedSites
  //         .flatMap(({ versions }) => versions)
  //         .map(item => [`${item.app}::${item.version}`, item])
  //     ).values()
  //   ).sort((a, b) => a.label.localeCompare(b.label));
  // }, [processedSites]);

  const appVersionOptions = useMemo(() => {
    return Array.from(
      new Map(
        processedSites
          .flatMap(({ versions }) => versions)
          .filter(item => {
            // Apply rule only for PIC
            if (item.app === 'PIC') {
              return /^\d{2}/.test(item.version); // starts with 2 digits
            }
            return true; // keep all others (ICS, PWM)
          })
          .map(item => [`${item.app}::${item.version}`, item])
      ).values()
    ).sort((a, b) => a.label.localeCompare(b.label));
  }, [processedSites]);

  const summary = useMemo(() => {
    return {
      total: processedSites.length,
      down: processedSites.filter(item => item.overallStatus === 'DOWN').length,
      warning: processedSites.filter(item => item.overallStatus === 'WARNING').length,
      minor: processedSites.filter(item => item.overallStatus === 'MINOR').length,
      healthy: processedSites.filter(item => item.overallStatus === 'UP').length
    };
  }, [processedSites]);

  const summaryCards = [
    { label: 'Total Sites', value: summary.total, key: 'ALL' },
    { label: 'Down', value: summary.down, key: 'DOWN' },
    { label: 'Warning', value: summary.warning, key: 'WARNING' },
    { label: 'Minor', value: summary.minor, key: 'MINOR' },
    { label: 'Healthy', value: summary.healthy, key: 'UP' }
  ];

  const refreshDashboard = async () => {
    await fetchData();
  };

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
      <AppBar
        position="sticky"
        elevation={2}
        color="transparent"
        sx={{ backdropFilter: 'blur(8px)', mb: 3 }}
      >
        <Toolbar sx={{ gap: 2, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box component="img" src={pgtLogo} alt="PGT Logo" sx={{ height: { xs: 56, md: 72 } }} />
            <Box>
              <Typography variant="h4">PFNA Whse Sys Health Dashboard</Typography>
              <Typography variant="body2" color="text.secondary">
                Last refresh: {lastRefreshTime ? lastRefreshTime.toLocaleString() : 'Loading...'}
              </Typography>
            </Box>
          </Stack>

          <Button variant="contained" startIcon={<RefreshIcon />} onClick={refreshDashboard}>
            Refresh
          </Button>
        </Toolbar>
      </AppBar>

      {/* <Card elevation={0} sx={{ mb: 3, p: 1.5, border: theme => `1px solid ${theme.palette.divider}` }}>
        <Tabs value={activeTab} onChange={(e, value) => setActiveTab(value)} variant="fullWidth">
          <Tab label="Deployed" />
          <Tab label="Non-Deployed" />
        </Tabs>
      </Card> */}

      {dashboardView === 'status' && (
        <>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {summaryCards.map(card => {
            const isActive = summaryFilter === card.key;

            return (
              <Grid item xs={12} sm={6} lg={3} key={card.label}>
                <Card
                  elevation={0}
                  onClick={() => setSummaryFilter(prev => (prev === card.key ? 'ALL' : card.key))}
                  sx={{
                    cursor: 'pointer',
                    border: theme =>
                      `2px solid ${isActive ? theme.palette.primary.main : theme.palette.divider}`,
                    backgroundColor: theme =>
                      isActive
                        ? (theme.palette.mode === 'light'
                            ? 'rgba(25, 118, 210, 0.08)'
                            : 'rgba(25, 118, 210, 0.18)')
                        : theme.palette.background.paper,
                    boxShadow: isActive ? 6 : 0,
                    transform: isActive ? 'translateY(-1px)' : 'none',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                >
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography
                        variant="body2"
                        sx={{
                          color: isActive ? 'primary.main' : 'text.secondary',
                          fontWeight: isActive ? 700 : 400
                        }}
                      >
                        {card.label}
                      </Typography>

                      {isActive && (
                        <Chip
                          label="Active"
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ borderRadius: 999 }}
                        />
                      )}
                    </Stack>

                    <Typography
                      variant="h4"
                      sx={{
                        mt: 1,
                        color: isActive ? 'primary.main' : 'text.primary',
                        fontWeight: isActive ? 700 : 600
                      }}
                    >
                      {card.value}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        <Card elevation={0} sx={{ p: 2, mb: 3, border: theme => `1px solid ${theme.palette.divider}` }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Autocomplete
                multiple
                options={siteSearchOptions}
                value={selectedSites}
                inputValue={siteSearchInput}
                onInputChange={(event, newInputValue) => setSiteSearchInput(newInputValue)}
                onChange={(event, newValue) => setSelectedSites(newValue)}
                getOptionLabel={(option) => option.optionLabel}
                isOptionEqualToValue={(option, value) => option.siteKey === value.siteKey}
                filterSelectedOptions
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search Sites"
                    placeholder="Type to filter cards or select sites"
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Autocomplete
                multiple
                options={appVersionOptions}
                value={selectedAppVersions}
                onChange={(event, newValue) => setSelectedAppVersions(newValue)}
                getOptionLabel={(option) => option.label}
                isOptionEqualToValue={(option, value) =>
                  option.app === value.app && option.version === value.version
                }
                filterSelectedOptions
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="App Version"
                    placeholder="Select app version"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Autocomplete
                multiple
                options={siteTypeOptions}
                value={selectedSiteTypes}
                onChange={(event, newValue) => setSelectedSiteTypes(newValue)}
                filterSelectedOptions
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Site Type"
                    placeholder="Select site type"
                  />
                )}
              />
            </Grid>
          </Grid>
        </Card>

        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
          <Chip label="All sites" color="primary" variant="outlined" />
          <Chip label={`${filteredSites.length} showing`} variant="outlined" />
        </Stack>

        <Grid container spacing={2}>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <Grid item xs={12} md={6} xl={4} key={idx}>
                <Skeleton variant="rounded" height={260} />
              </Grid>
            ))
          ) : (
            filteredSites.map(siteGroup => {
              const site = siteGroup[0];
              const siteKey = `${site.site_abbr}-${site.site_env}`;

              return (
                <Grid item xs={12} md={6} xl={4} key={siteKey}>
                  <SiteCard
                    site={siteGroup}
                    onOpenDetails={() => {
                      setDetailsSiteGroup(siteGroup);
                      setIsDetailsDrawerOpen(true);
                    }}
                  />
                </Grid>
              );
            })
          )}
        </Grid>

        {!isLoading && filteredSites.length === 0 && (
          <Card
            elevation={0}
            sx={{ mt: 3, p: 4, textAlign: 'center', border: theme => `1px solid ${theme.palette.divider}` }}
          >
            <Typography variant="h6">No sites matched your filters.</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Try clearing the selected Site / App Version / site type filters.
            </Typography>
          </Card>
        )}

        <SiteDetailsDrawer
          open={isDetailsDrawerOpen}
          siteGroup={detailsSiteGroup}
          onClose={() => setIsDetailsDrawerOpen(false)}
        />
      </>
      )}
      </Box>
    );
  }
export default MainDashboard;
