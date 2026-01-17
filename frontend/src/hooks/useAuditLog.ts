import { useState, useCallback } from 'react';
import type { AuditEvent, AuditAction, PermissionPolicy } from '@/types';
import { loadAuditLog, appendAuditEvent } from '@/lib/storage';

export function useAuditLog() {
  const [events, setEvents] = useState<AuditEvent[]>(() => loadAuditLog());

  const addEvent = useCallback((
    action: AuditAction,
    reason: string,
    permissionUsed: Partial<PermissionPolicy>,
    metadata?: Record<string, any>
  ) => {
    const event: AuditEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ts: new Date().toISOString(),
      action,
      reason,
      permissionUsed,
      metadata,
    };

    const updated = appendAuditEvent(event);
    setEvents(updated);
    return event;
  }, []);

  const getRecentEvents = useCallback((count: number = 8) => {
    return events.slice(-count).reverse();
  }, [events]);

  const getFilteredEvents = useCallback((
    actionFilter?: AuditAction[],
    startDate?: Date,
    endDate?: Date
  ) => {
    return events.filter(event => {
      if (actionFilter && actionFilter.length > 0) {
        if (!actionFilter.includes(event.action)) return false;
      }
      if (startDate) {
        if (new Date(event.ts) < startDate) return false;
      }
      if (endDate) {
        if (new Date(event.ts) > endDate) return false;
      }
      return true;
    }).reverse();
  }, [events]);

  return {
    events,
    addEvent,
    getRecentEvents,
    getFilteredEvents,
  };
}
