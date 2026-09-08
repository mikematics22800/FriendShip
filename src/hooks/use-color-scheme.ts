import { useEffect, useState } from 'react';
import { Platform, useColorScheme as useRNColorScheme } from 'react-native';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
function useWebColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();
  return hasHydrated ? colorScheme : 'light';
}

export const useColorScheme = Platform.OS === 'web' ? useWebColorScheme : useRNColorScheme;
