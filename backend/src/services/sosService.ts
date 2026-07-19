// SOS incident helpers shared by the public route (routes/sos.ts) and the
// admin moderation endpoints (routes/admin.ts): one Socket.io holder so both
// can emit to the security dashboard, plus the common wire format.

import { Server } from 'socket.io';

let io: Server | null = null;

export function setSosSocketIO(socketIO: Server): void {
  io = socketIO;
}

interface IncidentWithUser {
  id: string;
  userId: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  audioUrl: string | null;
  status: string;
  resolutionNote: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  user?: { firstName: string | null; lastName: string | null; email: string } | null;
}

/** Shape sent to the security dashboard (socket events and admin list). */
export function serializeIncident(incident: IncidentWithUser) {
  const senderName = incident.user
    ? `${incident.user.firstName || ''} ${incident.user.lastName || ''}`.trim() ||
      incident.user.email
    : null;
  return {
    id: incident.id,
    latitude: incident.latitude,
    longitude: incident.longitude,
    accuracy: incident.accuracy,
    audioUrl: incident.audioUrl,
    status: incident.status,
    resolutionNote: incident.resolutionNote,
    resolvedAt: incident.resolvedAt,
    createdAt: incident.createdAt,
    senderName, // null = anonymous
    senderEmail: incident.user?.email ?? null,
  };
}

/** New alert → every connected admin dashboard. */
export function emitSosNew(incident: IncidentWithUser): void {
  io?.to('security').emit('sos:new', serializeIncident(incident));
}

/**
 * Incident changed (audio attached, resolved, false-alarmed) → dashboards,
 * and — when the sender was logged in — their own device, so the SOS UI can
 * flip to "security is responding / resolved".
 */
export function emitSosUpdated(incident: IncidentWithUser): void {
  const payload = serializeIncident(incident);
  io?.to('security').emit('sos:updated', payload);
  if (incident.userId) {
    io?.to(`user:${incident.userId}`).emit('sos:status', {
      id: incident.id,
      status: incident.status,
      resolvedAt: incident.resolvedAt,
    });
  }
}
