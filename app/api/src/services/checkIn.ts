import type { Qr, AttendanceEvent, Location, Session } from "../models/types.js";
import { distanceInMeters } from "../utils/geo.js";

interface CheckInInput {
  qrCode: string; // lo que escaneó
  participantId: string; // quién escanea
  gps: { latitude: number; longitude: number }; // dónde está parado
}

type CheckInResult =
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

// QRs de prueba — hasta que exista el repository
const fakeQrs: Qr[] = [
  {
    id: "qr-1",
    tenantId: "t-1",
    locationId: "loc-1",
    data: "ABC",
    expiresAt: "2030-01-01T00:00:00Z",
    active: true,
  },
];

// Locations de prueba — hasta que exista el repository
const fakeLocations: Location[] = [
  {
    id: "loc-1",
    tenantId: "t-1",
    name: "Location 1",
    latitude: 40.7128,
    longitude: -74.006,
    radiusMeters: 100,
  },
];

// Sesiones de prueba — simula la tabla (en memoria)
const fakeSessions: Session[] = [];

export function checkIn(
  input: CheckInInput,
  qrs: Qr[] = fakeQrs,
  locations: Location[] = fakeLocations,
  sessions: Session[] = fakeSessions,
): CheckInResult {
  // 1. validar el QR (existe, activo, vigente)
  const qrFound = qrs.find((q) => q.data === input.qrCode);

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
  const location = locations.find((l) => l.id === qrFound.locationId);

  if (!location) {
    return { ok: false, reason: "qr-invalid" };
  }

  const distance = distanceInMeters(input.gps, location);

  if (distance > location.radiusMeters) {
    return { ok: false, reason: "out-of-radius" };
  }

  // 3. regla de negocio: no podés entrar dos veces sin salir
  const alreadyIn = sessions.some(
    (s) => s.participantId === input.participantId && s.status === "open",
  );

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

  // 5. A3: abrir la sesión (se cierra en check-out)
  const session: Session = {
    id: crypto.randomUUID(),
    tenantId: qrFound.tenantId,
    participantId: input.participantId,
    locationId: qrFound.locationId,
    checkInAt: now,
    status: "open",
  };
  sessions.push(session);

  return { ok: true, event, session };
}