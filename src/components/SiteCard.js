import React, { useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  Stack
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningIcon from '@mui/icons-material/Warning';
import {
  APP_NAMES,
  STATUS_UP,
  STATUS_DOWN,
  STATUS_MINOR_ISSUE,
  STATUS_NON_PRIORITY_ISSUE
} from './Constants';

function SiteCard({ site, onOpenDetails }) {
  const getStatusForApp = (appName) => {
    const appRows = site.filter(record => record.app_nm === appName);

    const criticalDown = appRows.some(
      record => record.app_prc_priority === '1' && record.app_prc_stat === STATUS_DOWN
    );
    if (criticalDown) return STATUS_DOWN;

    const nonCriticalDownCount = appRows.filter(
      record => record.app_prc_stat === STATUS_DOWN && record.app_prc_priority !== '1'
    ).length;

    if (nonCriticalDownCount >= 5) return STATUS_NON_PRIORITY_ISSUE;
    if (nonCriticalDownCount >= 1) return STATUS_MINOR_ISSUE;

    return STATUS_UP;
  };

  const getAppCounts = (appName) => {
    const appRows = site.filter(record => record.app_nm === appName);
    return {
      up: appRows.filter(record => record.app_prc_stat === 'UP').length,
      down: appRows.filter(record => record.app_prc_stat === 'DOWN').length
    };
  };

  const overallStatus = APP_NAMES.some(app => getStatusForApp(app) === STATUS_DOWN)
    ? STATUS_DOWN
    : APP_NAMES.some(app => getStatusForApp(app) === STATUS_NON_PRIORITY_ISSUE)
      ? STATUS_NON_PRIORITY_ISSUE
      : APP_NAMES.some(app => getStatusForApp(app) === STATUS_MINOR_ISSUE)
        ? STATUS_MINOR_ISSUE
        : STATUS_UP;

  const statusMeta = {
    [STATUS_UP]: { icon: <CheckCircleIcon color="success" />, label: 'Healthy' },
    [STATUS_DOWN]: { icon: <CancelIcon color="error" />, label: 'Down' },
    [STATUS_NON_PRIORITY_ISSUE]: { icon: <WarningIcon color="warning" />, label: 'Warning' },
    [STATUS_MINOR_ISSUE]: { icon: <CheckCircleIcon color="success" />, label: 'Minor' }
  };

  const latestUpdateTime = useMemo(() => {
    const raw = site.reduce(
      (max, row) => (row.last_updt_time > max ? row.last_updt_time : max),
      site[0]?.last_updt_time
    );
    return raw ? new Date(raw) : null;
  }, [site]);

  const groupedByApp = useMemo(() => {
    return site.reduce((acc, row) => {
      if (!acc[row.app_nm]) acc[row.app_nm] = [];
      acc[row.app_nm].push(row);
      return acc;
    }, {});
  }, [site]);

  const appVersions = useMemo(() => {
    return Object.entries(groupedByApp).map(([app, rows]) => ({
      app,
      version: rows[0]?.max_app_version || 'N/A'
    }));
  }, [groupedByApp]);

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        border: theme => `1px solid ${theme.palette.divider}`,
        '&:hover': { transform: 'translateY(-2px)', boxShadow: 6 }
      }}
    >
      <CardContent>
        <Stack direction="row" justifyContent="space-between">
          <Box>
            <Typography variant="h6">
              {site[0].wave_nbr} - {site[0].site_full_nm}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {site[0].site_abbr} ({site[0].site_env}) • {site[0].site_type}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Loc: {site[0].loc_ctry_code}/{site[0].loc_co_code}/{site[0].loc_nbr}
            </Typography>
          </Box>

          <Stack alignItems="center">
            {statusMeta[overallStatus].icon}
            <Typography variant="caption">{statusMeta[overallStatus].label}</Typography>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ my: 2 }}>
          {APP_NAMES.filter(app => groupedByApp[app]?.length).map(app => {
            const counts = getAppCounts(app);
            const appStatus = getStatusForApp(app);

            const chipColor =
              appStatus === STATUS_DOWN
                ? 'error'
                : appStatus === STATUS_NON_PRIORITY_ISSUE
                  ? 'warning'
                  : appStatus === STATUS_MINOR_ISSUE
                    ? 'info'
                    : 'success';

            return (
              <Chip
                key={app}
                label={`${app} ↑ ${counts.up} ↓ ${counts.down}`}
                color={chipColor}
                variant="outlined"
              />
            );
          })}
        </Stack>

        <Box>
          <Typography variant="caption">Versions</Typography>
          {appVersions.map(v => (
            <Typography key={v.app} variant="body2" sx={{ wordBreak: 'break-word' }}>
              {v.app}: {v.version}
            </Typography>
          ))}
        </Box>

        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
          <Typography variant="body2" fontWeight={700} color="text.secondary">
            Last update: {latestUpdateTime ? latestUpdateTime.toLocaleString() : 'N/A'}
          </Typography>
          <Button
            variant="outlined"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails();
            }}
          >
            Show Details
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default React.memo(SiteCard);