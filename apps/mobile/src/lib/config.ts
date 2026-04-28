import { Platform } from 'react-native';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function getDevApiBaseUrl(): string {
  if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
  return 'http://localhost:3000';
}

export function getApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (origin.startsWith('http://') || origin.startsWith('https://')) {
      return trimTrailingSlash(origin);
    }
  }

  if (configured) return trimTrailingSlash(configured);
  if (__DEV__) return getDevApiBaseUrl();
  throw new Error('EXPO_PUBLIC_API_BASE_URL is required for production builds');
}

export const API_BASE_URL = getApiBaseUrl();
