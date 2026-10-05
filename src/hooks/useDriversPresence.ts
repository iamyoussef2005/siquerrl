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
      const timeStr = date.toLocaleTimeString('ar-SY', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `اليوم ${timeStr}`;
    }
    if (diffDays === 1) {
      const timeStr = date.toLocaleTimeString('ar-SY', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `أمس ${timeStr}`;
    }
    if (diffDays < 7) {
      return `منذ ${diffDays} أيام`;
    }
    return date.toLocaleDateString('ar-SY', { month: 'short', day: 'numeric' });
  } catch {
    return 'غير متصل';
  }
}

export function useDriversPresence(initialDrivers: Profile[] = []) {
  const [onlineDriverIds, setOnlineDriverIds] = useState<Set<string>>(new Set());
  const [presenceData, setPresenceData] = useState<Map<string, DriverPresenceInfo>>(new Map());
  const [channelConnected, setChannelConnected] = useState<boolean>(false);

  useEffect(() => {
    let presenceChannel: RealtimeChannel | null = null;

    const channelName = 'drivers-presence';
    presenceChannel = supabase.channel(channelName, {
      config: {
        presence: {
          key: 'admin_dashboard_' + Math.random().toString(36).substring(2, 8),
        },
      },
    });

    const updatePresenceState = () => {
      if (!presenceChannel) return;
      const state = presenceChannel.presenceState();
      const onlineSet = new Set<string>();
      const infoMap = new Map<string, DriverPresenceInfo>();

      Object.keys(state).forEach((key) => {
        const presences = state[key] as unknown as DriverPresenceInfo[];
        presences.forEach((p) => {
          if (p.driver_id) {
            onlineSet.add(p.driver_id);
            infoMap.set(p.driver_id, p);
          }
        });
      });

      setOnlineDriverIds(onlineSet);
      setPresenceData(infoMap);
    };

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        updatePresenceState();
      })
      .on('presence', { event: 'join' }, () => {
        updatePresenceState();
      })
      .on('presence', { event: 'leave' }, () => {
        updatePresenceState();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setChannelConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setChannelConnected(false);
        }
      });

    return () => {
      if (presenceChannel) {
        supabase.removeChannel(presenceChannel);
      }
    };
  }, []);

  const isDriverOnline = useCallback(
    (driverId?: string | null): boolean => {
      if (!driverId) return false;
      return onlineDriverIds.has(driverId);
    },
    [onlineDriverIds]
  );

  // Sort drivers: online drivers first, then offline sorted by last_seen_at descending
  const sortDriversByPresence = useCallback(
    (drivers: Profile[] = []): Profile[] => {
      if (!drivers || !Array.isArray(drivers)) return [];
      return [...drivers].sort((a, b) => {
        if (!a || !b) return 0;
        const aOnline = onlineDriverIds.has(a.id);
        const bOnline = onlineDriverIds.has(b.id);

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
    [onlineDriverIds]
  );

  const onlineCount = useMemo(() => onlineDriverIds.size, [onlineDriverIds]);

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
