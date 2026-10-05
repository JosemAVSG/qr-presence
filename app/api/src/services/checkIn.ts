import type { AttendanceEvent, Session } from "../models/types.js";
import type {
  QrRepository,
  LocationRepository,
  SessionRepository,
  EventRepository,
} from "../repositories/ports.js";
import { distanceInMeters } from "../utils/geo.js";

export interface CheckInInput {
  qrCode: string; // lo que escaneó
  participantId: string; // quién escanea
  gps: { latitude: number; longitude: number }; // dónde está parado
}

export type CheckInResult =
  | { ok: true; event: AttendanceEvent; session: Session }
  | {
      ok: false;
      reason:
        | "qr-invalid"
        | "qr-expired"
        | "qr-inactive"
        | "out-of-radius"
        | "duplicate-check-in";
    };

// Dependencias del service — agrupadas en un objeto (evita 4 parámetros sueltos).
// Depende de las INTERFACES, no de DynamoDB → testeable con fakes en memoria.
export interface CheckInDeps {
  qrRepo: QrRepository;
  locationRepo: LocationRepository;
  sessionRepo: SessionRepository;
  eventRepo: EventRepository;
}

export async function checkIn(input: CheckInInput, deps: CheckInDeps): Promise<CheckInResult> {
  // 1. validar el QR (existe, activo, vigente)
  const qrFound = await deps.qrRepo.findByCode(input.qrCode);

  if (!qrFound) {
    return { ok: false, reason: "qr-invalid" };
  }

  if (!qrFound.active) {
    return { ok: false, reason: "qr-inactive" };
  }

  if (qrFound.expiresAt < new Date().toISOString()) {
    return { ok: false, reason: "qr-expired" };
  }

  // 2. validar GPS contra la location del QR
  const location = await deps.locationRepo.findById(qrFound.tenantId, qrFound.locationId);

  if (!location) {
    return { ok: false, reason: "qr-invalid" };
  }

  const distance = distanceInMeters(input.gps, location);

  if (distance > location.radiusMeters) {
    return { ok: false, reason: "out-of-radius" };
  }

  // 3. regla de negocio: no podés entrar dos veces sin salir
  const alreadyIn = await deps.sessionRepo.findOpenByParticipant(input.participantId);

  if (alreadyIn) {
    return { ok: false, reason: "duplicate-check-in" };
  }

  // 4. crear el evento de entrada
  const now = new Date().toISOString();
  const event: AttendanceEvent = {
    id: crypto.randomUUID(),
    tenantId: qrFound.tenantId,
    participantId: input.participantId,
    locationId: qrFound.locationId,
    eventType: "check-in",
    timestamp: now,
    gps: input.gps,
  };
  await deps.eventRepo.save(event);

  // 5. A3: abrir la sesión (se cierra en check-out)
  const session: Session = {
    id: crypto.randomUUID(),
    tenantId: qrFound.tenantId,
    participantId: input.participantId,
    locationId: qrFound.locationId,
    checkInAt: now,
    status: "open",
  };
  await deps.sessionRepo.open(session);

  return { ok: true, event, session };
}