import AsyncStorage from '@react-native-async-storage/async-storage';
import { Community, UserProfile } from '../types';

const communitiesMemoryCache = new Map<string, Community[]>();
const userMemoryCache = new Map<string, UserProfile>();

function commKey(userId?: string): string {
  return userId || 'anon';
}

export function getCachedCommunities(userId?: string): Community[] | null {
  return communitiesMemoryCache.get(commKey(userId)) ?? null;
}

export function setCachedCommunities(
  userId: string | undefined,
  data: Community[]
): void {
  const key = commKey(userId);
  communitiesMemoryCache.set(key, data);
  AsyncStorage.setItem(`common_cache_comm_${key}`, JSON.stringify(data)).catch(
    () => {}
  );
}

export async function hydrateCommunitiesFromDisk(
  userId?: string
): Promise<Community[] | null> {
  const key = commKey(userId);
  const mem = communitiesMemoryCache.get(key);
  if (mem) return mem;
  try {
    const raw = await AsyncStorage.getItem(`common_cache_comm_${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      communitiesMemoryCache.set(key, parsed);
      return parsed;
    }
  } catch {}
  return null;
}

export function getCachedUser(userId?: string): UserProfile | null {
  if (!userId) return null;
  return userMemoryCache.get(userId) ?? null;
}

export function setCachedUser(
  userId: string | undefined,
  profile: UserProfile
): void {
  if (!userId) return;
  userMemoryCache.set(userId, profile);
  AsyncStorage.setItem(`common_cache_user_${userId}`, JSON.stringify(profile)).catch(
    () => {}
  );
}

export async function clearDataCache(): Promise<void> {
  communitiesMemoryCache.clear();
  userMemoryCache.clear();
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith('common_cache_'));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch {}
}
