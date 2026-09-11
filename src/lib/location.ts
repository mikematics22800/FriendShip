import * as Location from 'expo-location';

export type UserLocation = {
  latitude: number;
  longitude: number;
};

/** Asks for foreground location if needed, then returns current coordinates. Never persists. */
export async function requestUserLocation(): Promise<UserLocation | null> {
  try {
    let permission = await Location.getForegroundPermissionsAsync();
    if (permission.status === Location.PermissionStatus.UNDETERMINED) {
      permission = await Location.requestForegroundPermissionsAsync();
    }

    if (!permission.granted) return null;

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch (cause) {
    console.warn('Could not read location:', cause);
    return null;
  }
}
