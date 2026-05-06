import React, { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

import { fetchAvailabilityProcessDrilldown } from './api/ReadAvailabilityProcessDrilldownApi';

const PIC_NOT_APPLICABLE_SITE_TYPES = ['PL', 'GES', 'RW'];

const formatSnapshotTime = (value) => {
  if (!value) return '';

  return new Date(value).toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',   // ✅ keep seconds here
    hour12: true
  });
};

const formatBucketRange = (bucketStart, hours) => {
  if (!bucketStart) return '';

  const start = new Date(bucketStart);
  const end = new Date(start);

  const bucketMinutes =
    hours <= 12 ? 15 :
    hours <= 24 ? 30 :
    hours <= 48 ? 60 :
    120;

  end.setMinutes(end.getMinutes() + bucketMinutes);

  const datePart = start.toLocaleDateString('en-US', {
    timeZone: 'America/Chicago',
    month: 'short',
    day: 'numeric'
  });

  const timeOptions = {
    timeZone: 'America/Chicago',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };

  const startTime = start.toLocaleTimeString('en-US', timeOptions);
  const endTime = end.toLocaleTimeString('en-US', timeOptions);

  return `${datePart}, ${startTime} - ${endTime}`;
};

function AppAvailabilityChart({ data, availabilitySite, hours }) {
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [drilldownRows, setDrilldownRows] = useState([]);
  const [isDrilldownLoading, setIsDrilldownLoading] = useState(false);
  const [drilldownError, setDrilldownError] = useState(null);
  const [showAllProcesses, setShowAllProcesses] = useState(false);

  const getAvailabilityColor = (value) => {
    if (value === 100) return '#2e7d32';      // green
    if (value >= 95) return '#ed6c02';        // orange
    return '#d32f2f';                         // red
    };
  const getTickFormatter = (hours) => {
    return (value) => {
      const date = new Date(value);

      if (hours <= 12) {
        return date.toLocaleTimeString('en-US', {
          timeZone: 'America/Chicago',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }

      if (hours <= 48) {
        return date.toLocaleTimeString('en-US', {
          timeZone: 'America/Chicago',
          hour: 'numeric',
          hour12: true
        });
      }

      return date.toLocaleDateString('en-US', {
        timeZone: 'America/Chicago',
        month: 'short',
        day: 'numeric'
      });
    };
  };
  const siteType = availabilitySite?.site?.site_type;
  const isPICApplicable =
    siteType && !PIC_NOT_APPLICABLE_SITE_TYPES.includes(siteType);
  const chartData = useMemo(() => {
    const grouped = {};

    data.forEach(row => {
      const time = row.time_bucket;
      const app = row.app_nm;

      const up = Number(row.up_count || 0);
      const down = Number(row.down_count || 0);
      const total = up + down;

      if (!grouped[time]) {
        grouped[time] = {
          time,
          ICS: {},
          PIC: {},
          PWM: {}
        };
      }

      grouped[time][app] = {
        actualSnapshotTime: row.actual_snapshot_time,
        bucketEnd: row.bucket_end,
        carriedForward: row.carried_forward,
        snapshotAgeMinutes: Number(row.snapshot_age_minutes || 0),
        isStale: row.is_stale,
        up,
        down,
        total,
        availability: row.availability_pct !== null
          ? Number(row.availability_pct)
          : null
      };
    });

    return Object.values(grouped);
  }, [data]);

  const buildSeries = (app) =>
    chartData.map(row => ({
      time: row.time,
      bucketEnd: row[app]?.bucketEnd ?? null,
      actualSnapshotTime: row[app]?.actualSnapshotTime ?? null,
      carriedForward: row[app]?.carriedForward ?? false,
      snapshotAgeMinutes: row[app]?.snapshotAgeMinutes ?? 0,
      isStale: row[app]?.isStale ?? false,
      availability: row[app]?.availability ?? null,
      up: row[app]?.up ?? 0,
      down: row[app]?.down ?? 0,
      total: row[app]?.total ?? 0
    }));
  const exportCsv = () => {
    const rows = [];

    chartData.forEach(row => {
      ['ICS', 'PIC', 'PWM'].forEach(app => {
        const d = row[app];
        if (!d) return;

        rows.push({
          app,
          bucket_start: row.time,
          bucket_end: d.bucketEnd,
          actual_snapshot_time: d.actualSnapshotTime,
          carried_forward: d.carriedForward,
          stale: d.isStale,
          up_count: d.up,
          down_count: d.down,
          total: d.total,
          availability_pct: d.availability
        });
      });
    });

    if (rows.length === 0) return;

    const headers = Object.keys(rows[0]);

    const csv = [
      headers.join(','),
      ...rows.map(row =>
        headers.map(h => `"${row[h] ?? ''}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `availability_timeline_${availabilitySite?.site?.site_abbr || 'site'}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const getLatestAvailability = (series) => {
    if (!series.length) return 100;
    return series[series.length - 1].availability;
  };

  const handlePointClick = async (app, point) => {
    if (!point?.actualSnapshotTime) return;

    const selected = {
      app,
      siteAbbr: availabilitySite?.site?.site_abbr,
      bucketStart: point.time,
      bucketEnd: point.bucketEnd,
      actualSnapshotTime: point.actualSnapshotTime,
      carriedForward: point.carriedForward,
      isStale: point.isStale,
      availability: point.availability,
      up: point.up,
      down: point.down,
      total: point.total
    };

    setSelectedPoint(selected);
    setShowAllProcesses(false);
    setIsDrilldownLoading(true);
    setDrilldownError(null);
    // do not clear drilldownRows here

    try {
      const rows = await fetchAvailabilityProcessDrilldown(
        selected.siteAbbr,
        app,
        point.actualSnapshotTime
      );

      setDrilldownRows(rows);
    } catch (error) {
      console.error('Failed to load drilldown:', error);
      setDrilldownError(error.message);
      setDrilldownRows([]);
    } finally {
      setIsDrilldownLoading(false);
    }
  };

  const isSelectedPoint = (app, point) => {
    return selectedPoint?.app === app &&
      selectedPoint?.bucketStart === point?.time &&
      selectedPoint?.actualSnapshotTime === point?.actualSnapshotTime;
  };

  const renderChart = (title, app) => {
    const series = buildSeries(app);
    const latest = getLatestAvailability(series);
    const dynamicColor = getAvailabilityColor(latest);  

    return (
      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>

          <Typography
            variant="h5"
            sx={{
              mb: 0.5,
              color: dynamicColor,
              fontWeight: 700
            }}
          >
            {latest !== null ? `${latest.toFixed(2)}%` : 'No Data'}
          </Typography>

          {series[series.length - 1]?.carriedForward && (
            <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
              Latest point is carried forward
            </Typography>
          )}

          {series[series.length - 1]?.isStale && (
            <Typography variant="caption" color="error.main" sx={{ display: 'block' }}>
              Telemetry stale
            </Typography>
          )}

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            App Availability % by Time (CT)
          </Typography>

          <Box sx={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <LineChart
                data={series}
                margin={{ top: 10, right: 20, left: 0, bottom: 35 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  interval="preserveStartEnd"
                  minTickGap={60}
                  tickMargin={10}
                  height={55}
                  tickFormatter={getTickFormatter(hours)}
                  label={{
                    value: 'Time (Central Time)',
                    position: 'bottom',
                    offset: 14
                  }}
                />
                <YAxis
                  domain={[70, 100]}
                  tickFormatter={(v) => `${v}%`}
                  allowDecimals={false}
                  width={45}
                />

                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null;

                    const d = payload[0].payload;

                    return (
                      <Box
                        sx={{
                          bgcolor: 'background.paper',
                          border: theme => `1px solid ${theme.palette.divider}`,
                          borderRadius: 1,
                          p: 1,
                          boxShadow: 3
                        }}
                      >
                        {/*<Typography variant="caption">
                          {new Date(label).toLocaleString()}
                        </Typography>*/}
                        <Typography variant="caption" sx={{ display: 'block' }}>
                          Interval: {formatBucketRange(label, hours)}
                        </Typography>

                        {d.actualSnapshotTime && (
                          <Typography variant="caption" sx={{ display: 'block' }}>
                            Snapshot: {formatSnapshotTime(d.actualSnapshotTime)}
                          </Typography>
                        )}
                        {d.carriedForward && (
                          <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
                            Carried forward from previous snapshot
                          </Typography>
                        )}

                        {d.isStale && (
                          <Typography variant="caption" color="error.main" sx={{ display: 'block' }}>
                            Telemetry stale: {Math.round(d.snapshotAgeMinutes)} min old
                          </Typography>
                        )}
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {app}: {d.availability.toFixed(2)}%
                        </Typography>

                        <Typography variant="caption">
                          UP: {d.up} | DOWN: {d.down} | TOTAL: {d.total}
                        </Typography>
                      </Box>
                    );
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="availability"
                  stroke={dynamicColor}
                  strokeWidth={3}
                  dot={(props) => {
                    const { cx, cy, payload } = props;

                    if (!payload?.actualSnapshotTime) return null;

                    const selected = isSelectedPoint(app, payload);
                    const carried = payload.carriedForward;

                    if (!selected && !carried) return null;

                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={selected ? 7 : 4}
                        fill={selected ? dynamicColor : 'white'}
                        stroke={selected ? '#ffffff' : dynamicColor}
                        strokeWidth={selected ? 3 : 2}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handlePointClick(app, payload)}
                      />
                    );
                  }}
                  activeDot={{
                    r: 7,
                    style: { cursor: 'pointer' },
                    onClick: (e, payload) => {
                      handlePointClick(app, payload.payload);
                    }
                  }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const renderDrilldownCard = () => {
  if (!selectedPoint) {
    return (
      <Card elevation={0} sx={{ mt: 2, p: 3, border: theme => `1px solid ${theme.palette.divider}` }}>
        <Typography variant="h6">Selected Interval Details</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Click any chart point to view process-level details.
        </Typography>
      </Card>
    );
  }

  const visibleRows = showAllProcesses
    ? drilldownRows
    : drilldownRows.filter(row => row.app_prc_stat === 'DOWN');

  return (
    <Card elevation={0} sx={{ mt: 2, border: theme => `1px solid ${theme.palette.divider}` }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Box>
            <Typography variant="h6">Selected Interval Details</Typography>
            <Typography variant="body2" color="text.secondary">
              Site: {selectedPoint.siteAbbr} | App: {selectedPoint.app}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            {selectedPoint.carriedForward && (
              <Chip label="Carried Forward" color="warning" size="small" />
            )}
            {selectedPoint.isStale && (
              <Chip label="Stale Telemetry" color="error" size="small" />
            )}
          </Stack>
        </Stack>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <Typography variant="body2">
              <strong>Interval:</strong> {formatBucketRange(selectedPoint.bucketStart, hours)}
            </Typography>
            <Typography variant="body2">
              <strong>Snapshot Used:</strong> {formatSnapshotTime(selectedPoint.actualSnapshotTime)}
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="body2">
              <strong>Availability:</strong> {selectedPoint.availability !== null ? `${selectedPoint.availability.toFixed(2)}%` : 'No Data'}
            </Typography>
            <Typography variant="body2">
              <strong>Counts:</strong> UP: {selectedPoint.up} | DOWN: {selectedPoint.down} | TOTAL: {selectedPoint.total}
            </Typography>
          </Grid>
        </Grid>

        <Stack direction="row" spacing={1} sx={{ mt: 2, mb: 1 }}>
          <Button
            size="small"
            variant={showAllProcesses ? 'outlined' : 'contained'}
            onClick={() => setShowAllProcesses(false)}
          >
            Down Processes
          </Button>

          <Button
            size="small"
            variant={showAllProcesses ? 'contained' : 'outlined'}
            onClick={() => setShowAllProcesses(true)}
          >
            Show All Processes
          </Button>
        </Stack>

        {isDrilldownLoading && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
            <CircularProgress size={18} />
            <Typography variant="body2">Loading process details...</Typography>
          </Stack>
        )}

        {drilldownError && (
          <Typography color="error" sx={{ mt: 2 }}>
            Unable to load process details.
          </Typography>
        )}

        {!isDrilldownLoading && !drilldownError && (
          <TableContainer sx={{ mt: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Process</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Last Update Time</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {visibleRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography variant="body2" color="text.secondary">
                        No DOWN processes found for this selected interval.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleRows.map((row, index) => (
                  <TableRow key={`${row.app_prc_nm}-${index}`}>
                    <TableCell>{row.app_prc_nm}</TableCell>

                    <TableCell>
                      <Chip
                        label={row.app_prc_stat}
                        color={row.app_prc_stat === 'DOWN' ? 'error' : 'success'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>

                    <TableCell>{row.app_prc_desc || '-'}</TableCell>

                    <TableCell>
                      {row.last_updt_time
                        ? formatSnapshotTime(row.last_updt_time)
                        : '-'}
                    </TableCell>
                  </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
};

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="outlined" onClick={exportCsv}>
          Export Timeline CSV
        </Button>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={isPICApplicable ? 4 : 6}>
          {renderChart('ICS Availability', 'ICS', '#1976d2')}
        </Grid>
        {isPICApplicable && (
          <Grid item xs={12} md={4}>
            {renderChart('PIC Availability', 'PIC', '#2e7d32')}
          </Grid>
        )}

        <Grid item xs={12} md={isPICApplicable ? 4 : 6}>
          {renderChart('PWM Availability', 'PWM', '#ed6c02')}
        </Grid>
     </Grid>
      {renderDrilldownCard()}
  </>
  );
}

export default AppAvailabilityChart;