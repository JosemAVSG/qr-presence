type TenantType = "school" | "workplace";
type ParticipantType = "student" | "employee";
type EventType = "check-in" | "check-out" | "present";
type RejectionReason =
  | "qr-expired"
  | "out-of-radius"
  | "duplicate-check-in"
  | "qr-invalid";

export interface Tenant {
  id: string;
  type: TenantType;
  participantType: ParticipantType;
  parentNotifications: boolean;
  checkOut: boolean;
}

export interface Participant {
  id: string;
  tenantId: string;
  departmentId: string;
  type: ParticipantType;
  name: string;
  lastName?: string;
  parentPhone?: string; // solo students — notificación a padres
  active: boolean;
}

export interface Location {
  id: string;
  tenantId: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface Qr {
  id: string;
  tenantId: string;
  locationId: string;
  data: string;
  expiresAt: string;
  active: boolean;
}

export interface AttendanceEvent {
  id: string;
  tenantId: string;
  participantId: string;
  locationId: string;
  eventType: EventType;
  timestamp: string;
  gps: { latitude: number; longitude: number };
}

export interface AuditEvent {
  id: string;
  tenantId: string;
  locationId: string;
  participantId?: string;
  timestamp: string;
  reason: RejectionReason;
  details?: string;
}
