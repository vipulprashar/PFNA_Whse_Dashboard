import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import {
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Stack,
  Typography,
  IconButton,
  Box
} from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import RefreshIcon from '@mui/icons-material/Refresh';
import SnoozeIcon from '@mui/icons-material/Snooze';
import AccessibleNavigationAnnouncer from './components/AccessibleNavigationAnnouncer';
import MainDashboard from './pages/MainDashboard';

function RedirectToMainDashboard() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/main-dashboard', { replace: true });
  }, [navigate]);
  return null;
}

function UpdateBanner({ countdown, onRefreshNow, onClose }) {
  return (
    <Dialog open fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1 }}>New updates available</DialogTitle>
      <DialogContent>
        <Stack spacing={2} alignItems="center">
          <Typography variant="h3" fontWeight={700}>{countdown}</Typography>
          <Typography variant="body1" color="text.secondary">
            Fresh dashboard data is ready. You can refresh now or snooze this prompt.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, justifyContent: 'space-between' }}>
        <Button startIcon={<SnoozeIcon />} onClick={onClose} color="inherit">
          Later
        </Button>
        <Button startIcon={<RefreshIcon />} variant="contained" onClick={onRefreshNow}>
          Refresh now
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function App() {
  const [mode, setMode] = useState(localStorage.getItem('dashboardTheme') || 'light');
  const [shouldDisplay, setShouldDisplay] = useState(false);
  const [reloadCountdown, setReloadCountdown] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('dashboardTheme', mode);
  }, [mode]);

  useEffect(() => {
    if (!shouldDisplay || reloadCountdown <= 0) {
      return undefined;
    }

    const timerId = setTimeout(() => {
      setReloadCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timerId);
  }, [reloadCountdown, shouldDisplay]);

  useEffect(() => {
    if (shouldDisplay && reloadCountdown === 0) {
      setShouldDisplay(false);
      setRefreshKey(prev => prev + 1);
    }
  }, [reloadCountdown, shouldDisplay]);

  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: { main: '#1976d2' },
      success: { main: mode === 'light' ? '#2e7d32' : '#81c784' },
      warning: { main: mode === 'light' ? '#ed6c02' : '#ffb74d' },
      error:   { main: mode === 'light' ? '#d32f2f' : '#ef5350' },
      background: {
        default: mode === 'light' ? '#f3f6fb' : '#0b1220',
        paper: mode === 'light' ? '#ffffff' : '#111827'
      }
    },
    shape: {
      borderRadius: 16
    },
    typography: {
      fontFamily: 'Consolas, monospace',
      h2: { fontWeight: 700 },
      h4: { fontWeight: 700 },
      h5: { fontWeight: 700 }
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 20
          }
        }
      }
    }
  }), [mode]);

  const toggleTheme = () => setMode(prev => (prev === 'light' ? 'dark' : 'light'));
  const handleRefreshNow = () => {
    setShouldDisplay(false);
    setReloadCountdown(0);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AccessibleNavigationAnnouncer />

        {!isDetailsOpen && (
          <Box sx={{ position: 'fixed', top: 12, right: 12, zIndex: 1400 }}>
            <IconButton
              onClick={toggleTheme}
              color="primary"
              sx={{ bgcolor: 'background.paper', boxShadow: 3 }}
            >
              {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Box>
        )}
        {shouldDisplay && (
          <UpdateBanner
            countdown={reloadCountdown}
            onRefreshNow={handleRefreshNow}
            onClose={() => setShouldDisplay(false)}
          />
        )}

        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route
              path="/main-dashboard"
              element={
                <MainDashboard
                  refreshKey={refreshKey}
                  setIsDetailsOpen={setIsDetailsOpen}
                />
              }
            />
            <Route path="/" element={<RedirectToMainDashboard />} />
          </Routes>
        </Suspense>

      </Router>
    </ThemeProvider>
  );
}

export default App;
