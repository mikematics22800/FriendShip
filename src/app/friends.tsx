import { Redirect } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { useAuthContext } from '@/hooks/use-auth-context';
import { FACEBOOK_FEATURE_ALERT } from '@/lib/supabase';

export default function Friends() {
  const { isLoading, linkedProviders, setFeatureAlert } = useAuthContext();

  useEffect(() => {
    if (isLoading || linkedProviders.facebook) return;
    setFeatureAlert(FACEBOOK_FEATURE_ALERT);
  }, [isLoading, linkedProviders.facebook, setFeatureAlert]);

  if (isLoading) return <View style={{ flex: 1 }} />;
  if (!linkedProviders.facebook) return <Redirect href="/profile" />;

  return <View style={{ flex: 1 }} />;
}
