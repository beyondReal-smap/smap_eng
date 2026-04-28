import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { z } from 'zod';

export async function readJsonState<T>(
  key: string,
  schema: z.ZodType<T>,
  fallback: T,
): Promise<T> {
  const raw =
    Platform.OS === 'web'
      ? typeof window === 'undefined'
        ? null
        : window.localStorage.getItem(key)
      : await SecureStore.getItemAsync(key);

  if (!raw) return fallback;

  try {
    return schema.parse(JSON.parse(raw));
  } catch (err) {
    console.warn(`[local-state] invalid payload for ${key}`, err);
    return fallback;
  }
}

export async function writeJsonState<T>(key: string, value: T): Promise<void> {
  const raw = JSON.stringify(value);
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, raw);
    }
    return;
  }
  await SecureStore.setItemAsync(key, raw);
}
