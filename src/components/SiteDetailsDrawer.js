import React, { useEffect, useMemo, useState } from 'react';
import { fetchSiteServers } from './api/ReadSiteServersApi';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Stack,
  Chip,
  Divider,
  Grid,
  Button,
  Tabs,
  Tab,
  Popover
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

function SiteDetailsDrawer({ open, siteGroup, onClose }) {
    const [showAllByApp, setShowAllByApp] = useState({});
    const [activeAppTab, setActiveAppTab] = useState(0);
    const [selectedProcess, setSelectedProcess] = useState(null);
    const [hoveredProcessKey, setHoveredProcessKey] = useState(null);
    const [previewAnchorEl, setPreviewAnchorEl] = useState(null);
    const [serverDetails, setServerDetails] = useState(null);
    const [isServerDetailsLoading, setIsServerDetailsLoading] = useState(false);
    const [serverDetailsError, setServerDetailsError] = useState(null);
    useEffect(() => {
        setSelectedProcess(null);
        setHoveredProcessKey(null);
        setPreviewAnchorEl(null);
        setShowAllByApp({});
        setActiveAppTab(0);
    }, [siteGroup, open]);
    useEffect(() => {
      const loadServerDetails = async () => {
        if (!open || !siteGroup?.length) return;

        const currentSite = siteGroup[0];

        try {
          setIsServerDetailsLoading(true);
          setServerDetailsError(null);

          const data = await fetchSiteServers(currentSite.site_abbr, currentSite.site_env);
          setServerDetails(data);
        } catch (error) {
          console.error('Failed to load server details:', error);
          setServerDetailsError(error.message);
          setServerDetails(null);
        } finally {
          setIsServerDetailsLoading(false);
        }
      };

      loadServerDetails();
    }, [open, siteGroup]);

  const groupedByApp = useMemo(() => {
    if (!siteGroup?.length) return {};
    return siteGroup.reduce((acc, row) => {
      if (!acc[row.app_nm]) acc[row.app_nm] = [];
      acc[row.app_nm].push(row);
      return acc;
    }, {});
  }, [siteGroup]);

  const appVersions = useMemo(() => {
    return Object.entries(groupedByApp).map(([app, rows]) => ({
      app,
      version: rows[0]?.max_app_version || 'N/A'
    }));
  }, [groupedByApp]);

  const appTabs = useMemo(() => Object.keys(groupedByApp), [groupedByApp]);
  const activeAppName = appTabs[activeAppTab];
  const activeAppProcesses = activeAppName ? groupedByApp[activeAppName] || [] : [];

  const getGridColumns = (appName, processType) => {
    if (appName === 'ICS') {
      return processType === 'APP' ? 4 : 6; // 3 per row for APP, 2 per row for COMM
    }
    if (appName === 'PIC') return 6; // 2 per row
    if (appName === 'PWM') return 6; // 2 per row
    return 6;
  };

  const getAppLink = (appName) => {
    const siteAbbr = siteGroup?.[0]?.site_abbr;
    const locNbr = siteGroup?.[0]?.loc_nbr;

    if (appName === 'ICS') {
      return `http://flicsweb${String(siteAbbr || '').toLowerCase()}1.corp.pep.pvt:44250/signon`;
    }

    if (appName === 'PIC') {
      return 'https://www.ipmportal.com';
    }

    if (appName === 'PWM') {
      return `https://pwm${locNbr}p01.corp.pep.pvt:8443/pwmweb`;
    }

    return null;
  };

  const renderProcessChip = (record) => {
    const key = `${record.app_nm}-${record.app_prc_nm}-${record.app_prc_type}`;
    const isActive =
        selectedProcess &&
        selectedProcess.app_nm === record.app_nm &&
        selectedProcess.app_prc_nm === record.app_prc_nm &&
        selectedProcess.app_prc_type === record.app_prc_type;

    let color = 'success';
    let variant = isActive ? 'filled' : 'outlined';
    let extraSx = {};

    if (record.app_prc_stat === 'DOWN') {
        color = 'error';
    } else if (record.app_prc_stat === 'NA') {
        color = 'default';
        extraSx = {
        opacity: 0.55,
        borderStyle: 'dashed'
        };
    }

    return (
        <Chip
        key={key}
        label={record.app_prc_nm}
        color={color}
        variant={variant}
        onMouseEnter={() => setHoveredProcessKey(key)}
        onMouseLeave={() => setHoveredProcessKey(null)}
        onClick={(e) => {
            const sameProcess =
            selectedProcess &&
            selectedProcess.app_nm === record.app_nm &&
            selectedProcess.app_prc_nm === record.app_prc_nm &&
            selectedProcess.app_prc_type === record.app_prc_type;

            if (sameProcess) {
            setSelectedProcess(null);
            setPreviewAnchorEl(null);
            return;
            }

            setSelectedProcess(record);
            setPreviewAnchorEl(e.currentTarget);
        }}
        sx={{
        width: '100%',
        fontWeight: 700,
        justifyContent: 'center',
        transition: 'all 0.15s ease',
        '& .MuiChip-label': {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
        },
        '&:hover': {
            transform: 'scale(1.03)',
            boxShadow: 2
        },
        ...(hoveredProcessKey === key && !isActive ? { boxShadow: 3 } : {}),
        ...extraSx
        }}
        />
    );
};

  if (!siteGroup?.length) return null;

  const site = siteGroup[0];

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', md: 760 },
          p: 3
        }
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>
            {site.wave_nbr} - {site.site_full_nm}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {site.site_abbr} ({site.site_env}) • {site.site_type}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Loc: {site.loc_ctry_code}/{site.loc_co_code}/{site.loc_nbr}
          </Typography>
        </Box>

        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Stack>

      <Box sx={{ mt: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Versions
        </Typography>
        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
          {appVersions.map(v => (
            <Typography key={v.app} variant="body2" sx={{ wordBreak: 'break-word' }}>
              {v.app}: {v.version}
            </Typography>
          ))}
        </Stack>
      </Box>

      <Divider sx={{ my: 2 }} />

        <Box sx={{ mt: 1 }}>
        <Tabs
            value={activeAppTab}
            onChange={(e, value) => setActiveAppTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mb: 2 }}
        >
            {appTabs.map((appName) => (
            <Tab key={appName} label={appName} />
            ))}
        </Tabs>

        <Box sx={{ borderTop: 1, borderColor: 'divider', mb: 2 }} />

        {activeAppName && (() => {
          const appName = activeAppName;
          const appProcesses = activeAppProcesses;
          const appVersion = appProcesses[0]?.max_app_version || 'N/A';
          const appServers = serverDetails?.servers_by_app?.[appName] || [];
          const appLink = getAppLink(appName);

          const appRecords = appProcesses.filter(p => p.app_prc_type === 'APP');
          const commRecords = appProcesses.filter(p => p.app_prc_type === 'COMM');

          // Only DOWN is an issue. NA is disabled, shown grey, not counted.
          const appProblemRecords = appRecords.filter(p => p.app_prc_stat === 'DOWN');
          const commProblemRecords = commRecords.filter(p => p.app_prc_stat === 'DOWN');

          const showAll = showAllByApp[appName] ?? true;
          const allProblemRecords = [...appProblemRecords, ...commProblemRecords];

          //const visibleAppRecords = showAll ? appRecords : appProblemRecords;
          //const visibleCommRecords = showAll ? commRecords : commProblemRecords;

          return (
  <Box
    sx={{
      p: 2,
      borderRadius: 3,
      bgcolor: 'action.hover',
      border: theme => `1px solid ${theme.palette.divider}`
    }}
  >
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
      <Typography variant="h6">{appName}</Typography>
      <Chip label={`Ver: ${appVersion}`} size="small" variant="outlined" />
    </Stack>
    <Box
      sx={{
        mb: 2,
        p: 1.5,
        borderRadius: 2,
        bgcolor: 'background.paper',
        border: theme => `1px solid ${theme.palette.divider}`
      }}
    >
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Infrastructure
      </Typography>

      {isServerDetailsLoading && (
        <Typography variant="body2" color="text.secondary">
          Loading server details...
        </Typography>
      )}

      {serverDetailsError && (
        <Typography variant="body2" color="error">
          Unable to load server details
        </Typography>
      )}

      {!isServerDetailsLoading && !serverDetailsError && (
        <Stack spacing={0.75}>
          {appServers.length > 0 ? (
            appServers.map((server, index) => (
              <Box key={`${server.server_name}-${index}`}>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {server.server_type}: {server.server_name || 'N/A'}
                </Typography>
                {/* {server.server_ip && (
                  <Typography variant="caption" color="text.secondary">
                    IP: {server.server_ip}
                  </Typography>
                )} */}
              </Box>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              No server details available
            </Typography>
          )}

          {appLink && (
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
              <Chip
                label={`Open ${appName}`}
                component="a"
                href={appLink}
                target="_blank"
                rel="noopener noreferrer"
                clickable
                size="small"
                variant="outlined"
              />
            </Stack>
          )}
        </Stack>
      )}
    </Box>

    <Box
      sx={{
        mb: 2,
        display: 'flex',
        justifyContent: 'flex-start'
      }}
    >
      <Button
        size="small"
        variant="outlined"
        color="primary"
        sx={{ borderRadius: 999 }}
        onClick={() =>
        setShowAllByApp(prev => {
            const current = prev[appName] ?? true;
            return {
            ...prev,
            [appName]: !current
            };
        })
        }
      >
        {showAll ? 'Show Problems Only' : 'Show All Processes'}
      </Button>
    </Box>

    {!showAll && (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Issues
        </Typography>
        {allProblemRecords.length > 0 ? (
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {allProblemRecords.map(renderProcessChip)}
          </Stack>
        ) : (
          <Chip label="No Issues" color="success" variant="outlined" />
        )}
      </Box>
    )}

    {showAll && (
      <Grid container spacing={2}>
        <Grid item xs={12} lg={6}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            APP Processes
          </Typography>
          <Grid container spacing={1}>
            {appRecords.length > 0 ? (
              appRecords.map((record) => (
                <Grid
                  item
                  xs={getGridColumns(appName, 'APP')}
                  key={`${record.app_nm}-${record.app_prc_nm}-${record.app_prc_type}`}
                >
                  {renderProcessChip(record)}
                </Grid>
              ))
            ) : (
              <Grid item xs={12}>
                <Chip label="No Issues" color="success" variant="outlined" />
              </Grid>
            )}
          </Grid>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            COMM Processes
          </Typography>
          <Grid container spacing={1}>
            {commRecords.length > 0 ? (
              commRecords.map((record) => (
                <Grid
                  item
                  xs={getGridColumns(appName, 'COMM')}
                  key={`${record.app_nm}-${record.app_prc_nm}-${record.app_prc_type}`}
                >
                  {renderProcessChip(record)}
                </Grid>
              ))
            ) : (
              <Grid item xs={12}>
                <Chip label="No Issues" color="success" variant="outlined" />
              </Grid>
            )}
          </Grid>
        </Grid>
      </Grid>
    )}
  </Box>
);
        })()}
      </Box>
      <Popover
        open={Boolean(previewAnchorEl && selectedProcess)}
        anchorEl={previewAnchorEl}
        onClose={() => {
            setSelectedProcess(null);
            setPreviewAnchorEl(null);
        }}
        anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left'
        }}
        transformOrigin={{
            vertical: 'top',
            horizontal: 'left'
        }}
        PaperProps={{
            sx: {
            p: 2,
            width: 360,
            maxWidth: '90vw',
            borderRadius: 3
            }
        }}
        >
        {selectedProcess && (
            <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                <InfoOutlinedIcon color="primary" />
                <Typography variant="subtitle1">Process Details</Typography>
                </Stack>

                <IconButton
                size="small"
                onClick={() => {
                    setSelectedProcess(null);
                    setPreviewAnchorEl(null);
                }}
                >
                <CloseIcon fontSize="small" />
                </IconButton>
            </Stack>

            <Typography variant="body2"><strong>Name:</strong> {selectedProcess.app_prc_nm}</Typography>
            <Typography variant="body2"><strong>Description:</strong> {selectedProcess.app_prc_desc || 'N/A'}</Typography>
            <Typography variant="body2"><strong>Priority:</strong> {selectedProcess.app_prc_priority || 'N/A'}</Typography>
            <Typography variant="body2"><strong>Type:</strong> {selectedProcess.app_prc_type || 'N/A'}</Typography>
            <Typography variant="body2"><strong>Status:</strong> {selectedProcess.app_prc_stat || 'N/A'}</Typography>
            <Typography variant="body2"><strong>Server:</strong> {selectedProcess.app_server_node_nm || 'N/A'}</Typography>
            <Typography variant="body2"><strong>App:</strong> {selectedProcess.app_nm || 'N/A'}</Typography>
            <Typography variant="body2"><strong>Version:</strong> {selectedProcess.app_version || 'N/A'}</Typography>
            </Box>
        )}
        </Popover>
    </Drawer>
  );
}

export default SiteDetailsDrawer;