/**
 * Fire-and-forget helper to dispatch background push notification to the assigned driver
 */
export function notifyDriverAssignment(orderId: number | string, driverId: string) {
  if (!orderId || !driverId) return;

  fetch('/api/notifications/driver-assignment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, driverId }),
  }).catch((err) => {
    console.warn('Failed to trigger driver notification API:', err);
  });
}
