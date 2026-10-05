'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface DriverPresenceInfo {
  driver_id: string;
  name?: string;
  online_at?: string;
}

export function formatLastSeenArabic(lastSeenAt?: string | null, isOnline?: boolean): string {
  if (isOnline) return 'متصل الآن';
  if (!lastSeenAt) return 'غير متصل';

  try {
    const date = new Date(lastSeenAt);
    if (isNaN(date.getTime())) return 'غير متصل';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'منذ لحظات';

    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'منذ لحظات';
    if (diffMin < 60) return `منذ ${diffMin} د`;
    if (diffHours < 24) {
      const timeStr = date.toLocaleTimeString('ar-SY-u-nu-latn', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `اليوم ${timeStr}`;
    }
    if (diffDays === 1) {
      const timeStr = date.toLocaleTimeString('ar-SY-u-nu-latn', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `أمس ${timeStr}`;
    }
    if (diffDays < 7) {
      return `منذ ${diffDays} أيام`;
    }
    return date.toLocaleDateString('ar-SY-u-nu-latn', { month: 'short', day: 'numeric' });
  } catch {
    return 'غير متصل';
  }
}

// Module-level Singleton State to prevent duplicate channel subscriptions
let sharedPresenceChannel: RealtimeChannel | null = null;
let sharedOnlineDriverIds = new Set<string>();
let sharedPresenceData = new Map<string, DriverPresenceInfo>();
let sharedChannelConnected = false;
const presenceListeners = new Set<() => void>();

function notifyPresenceListeners() {
  presenceListeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('Error in presence listener:', e);
    }
  });
}

function initSharedPresenceChannel() {
  if (sharedPresenceChannel) {
    return sharedPresenceChannel;
  }

  const channelName = 'drivers-presence';

  // Check if any old channel exists in supabase client and remove it to avoid collisions
  const existing = supabase.getChannels().find(
    (c) => c.topic === 'realtime:drivers-presence' || c.topic === 'drivers-presence'
  );
  if (existing) {
    try {
      supabase.removeChannel(existing);
    } catch (e) {
      console.warn('Old presence channel cleaned up:', e);
    }
  }

  const channel = supabase.channel(channelName, {
    config: {
      presence: {
        key: 'web_dashboard_' + Math.random().toString(36).substring(2, 8),
      },
    },
  });

  const updateState = () => {
    try {
      const state = channel.presenceState();
      const onlineSet = new Set<string>();
      const infoMap = new Map<string, DriverPresenceInfo>();

      Object.keys(state).forEach((key) => {
        const presences = state[key] as unknown as DriverPresenceInfo[];
        if (Array.isArray(presences)) {
          presences.forEach((p) => {
            if (p && p.driver_id) {
              onlineSet.add(p.driver_id);
              infoMap.set(p.driver_id, p);
            }
          });
        }
      });

      sharedOnlineDriverIds = onlineSet;
      sharedPresenceData = infoMap;
      notifyPresenceListeners();
    } catch (err) {
      console.error('Error parsing presence state:', err);
    }
  };

  // Register presence callbacks BEFORE calling subscribe()
  channel
    .on('presence', { event: 'sync' }, updateState)
    .on('presence', { event: 'join' }, updateState)
    .on('presence', { event: 'leave' }, updateState)
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        sharedChannelConnected = true;
        notifyPresenceListeners();
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        sharedChannelConnected = false;
        notifyPresenceListeners();
      }
    });

  sharedPresenceChannel = channel;
  return channel;
}

export function useDriversPresence(initialDrivers: Profile[] = []) {
  const [, setTick] = useState(0);

  useEffect(() => {
    initSharedPresenceChannel();

    const onUpdate = () => setTick((t) => t + 1);
    presenceListeners.add(onUpdate);

    return () => {
      presenceListeners.delete(onUpdate);
    };
  }, []);

  const onlineDriverIds = sharedOnlineDriverIds;
  const presenceData = sharedPresenceData;
  const channelConnected = sharedChannelConnected;

  const isDriverOnline = useCallback(
    (driverId?: string | null): boolean => {
      if (!driverId) return false;
      return sharedOnlineDriverIds.has(driverId);
    },
    []
  );

  // Sort drivers: online drivers first, then offline sorted by last_seen_at descending
  const sortDriversByPresence = useCallback(
    (drivers: Profile[] = []): Profile[] => {
      if (!drivers || !Array.isArray(drivers)) return [];
      return [...drivers].sort((a, b) => {
        if (!a || !b) return 0;
        const aOnline = sharedOnlineDriverIds.has(a.id);
        const bOnline = sharedOnlineDriverIds.has(b.id);

        if (aOnline && !bOnline) return -1;
        if (!aOnline && bOnline) return 1;

        const aName = a.name || a.full_name || '';
        const bName = b.name || b.full_name || '';

        if (aOnline && bOnline) {
          return aName.localeCompare(bName, 'ar');
        }

        // Both offline: sort by last_seen_at
        const aTime = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0;
        const bTime = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0;
        if (aTime !== bTime && !isNaN(aTime) && !isNaN(bTime)) {
          return bTime - aTime; // Most recent first
        }

        return aName.localeCompare(bName, 'ar');
      });
    },
    []
  );

  const onlineCount = sharedOnlineDriverIds.size;

  return {
    onlineDriverIds,
    presenceData,
    channelConnected,
    isDriverOnline,
    onlineCount,
    formatLastSeen: (lastSeenAt?: string | null, isOnline?: boolean) =>
      formatLastSeenArabic(lastSeenAt, isOnline),
    sortDriversByPresence,
  };
}
