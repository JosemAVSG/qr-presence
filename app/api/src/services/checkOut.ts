import type { AttendanceEvent } from "../models/types.js";
import type {
  TenantRepository,
  LocationRepository,
  SessionRepository,
  EventRepository,
} from "../repositories/ports.js";
import { distanceInMeters } from "../utils/geo.js";

// A diferencia de check-in, acá NO hay qrCode:
// el QR es solo para entrar. Para salir, identificás al participante.
export interface CheckOutInput {
  participantId: string;
  gps: { latitude: number; longitude: number };
}

export type CheckOutResult =
  | { ok: true; event: AttendanceEvent; hoursWorked: number }
  | {
      ok: false;
      reason: "no-open-session" | "out-of-radius" | "location-not-found" | "checkout-not-enabled";
    };

export interface CheckOutDeps {
  tenantRepo: TenantRepository;
  sessionRepo: SessionRepository;
  locationRepo: LocationRepository;
  eventRepo: EventRepository;
}

export async function checkOut(
  input: CheckOutInput,
  deps: CheckOutDeps,
): Promise<CheckOutResult> {
  // 1. buscar la sesión ABIERTA del participante (A3)
  const session = await deps.sessionRepo.findOpenByParticipant(input.participantId);

  if (!session) {
    return { ok: false, reason: "no-open-session" };
  }

  // 2. política del tenant: ¿esta organización permite check-out?
  //    (una escuela no; una alcaldía sí)
  const tenant = await deps.tenantRepo.findById(session.tenantId);

  if (!tenant || !tenant.checkOut) {
    return { ok: false, reason: "checkout-not-enabled" };
  }

  // 3. validar GPS contra la location de la sesión
  const location = await deps.locationRepo.findById(session.tenantId, session.locationId);

  if (!location) {
    return { ok: false, reason: "location-not-found" };
  }

  const distance = distanceInMeters(input.gps, location);

  if (distance > location.radiusMeters) {
    return { ok: false, reason: "out-of-radius" };
  }

  // 4. crear el evento de salida
  const checkOutAt = new Date().toISOString();
  const event: AttendanceEvent = {
    id: crypto.randomUUID(),
    tenantId: session.tenantId,
    participantId: input.participantId,
    locationId: session.locationId,
    eventType: "check-out",
    timestamp: checkOutAt,
    gps: input.gps,
  };
  await deps.eventRepo.save(event);

  // 5. calcular horas trabajadas y cerrar la sesión
  const hoursWorked = hoursBetween(session.checkInAt, checkOutAt);
  await deps.sessionRepo.close(input.participantId);

  return { ok: true, event, hoursWorked };
}

// Diferencia en horas entre dos timestamps ISO
function hoursBetween(fromIso: string, toIso: string): number {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  return ms / (1000 * 60 * 60);
}