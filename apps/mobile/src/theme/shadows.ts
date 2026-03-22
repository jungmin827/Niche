import { Platform } from 'react-native';

export const shadows = {
  subtle:
    Platform.select({
      ios: {
        shadowColor: '#111111',
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: {
        elevation: 1,
      },
      default: {},
    }) ?? {},
} as const;
