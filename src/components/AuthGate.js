import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography
} from '@mui/material';
import AppleIcon from '@mui/icons-material/Apple';
import GoogleIcon from '@mui/icons-material/Google';
import { supabase } from './api/supabaseClient';

const providers = [
  { id: 'google', label: 'Continue with Google', icon: <GoogleIcon /> },
  { id: 'apple', label: 'Continue with Apple', icon: <AppleIcon /> }
];

function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (error) {
        setAuthError(error.message);
      }

      setSession(data.session);
      setIsLoading(false);
    };

    loadSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
      setAuthError(null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithProvider = async (provider) => {
    setAuthError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/main-dashboard`
      }
    });

    if (error) {
      setAuthError(error.message);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (session) {
    return children(session);
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        px: 2,
        bgcolor: 'background.default'
      }}
    >
      <Card
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 420,
          border: theme => `1px solid ${theme.palette.divider}`
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h5">PFNA Whse Sys Health Dashboard</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Sign in to view dashboard status.
              </Typography>
            </Box>

            {authError && (
              <Alert severity="error">
                {authError}
              </Alert>
            )}

            <Stack spacing={1.5}>
              {providers.map(provider => (
                <Button
                  key={provider.id}
                  variant="outlined"
                  size="large"
                  startIcon={provider.icon}
                  onClick={() => signInWithProvider(provider.id)}
                  sx={{ justifyContent: 'flex-start' }}
                >
                  {provider.label}
                </Button>
              ))}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

export default AuthGate;
