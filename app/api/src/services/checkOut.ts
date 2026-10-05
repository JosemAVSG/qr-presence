import type { AttendanceEvent, Location, Session } from "../models/types.js";
import { distanceInMeters } from "../utils/geo.js";

// A diferencia de check-in, acá NO hay qrCode:
// el QR es solo para entrar. Para salir, identificás al participante.
interface CheckOutInput {
  participantId: string;
  gps: { latitude: number; longitude: number };
}

type CheckOutResult =
  | { ok: true; event: AttendanceEvent; hoursWorked: number }
  | { ok: false; reason: "no-open-session" | "out-of-radius" | "location-not-found" };

// Sesiones de prueba — hasta que exista el repository
const fakeSessions: Session[] = [
  {
    id: "session-1",
    tenantId: "t-1",
    participantId: "p-1",
    locationId: "loc-1",
    checkInAt: "2026-10-05T08:00:00Z",
    status: "open",
  },
];

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

export function checkOut(
  input: CheckOutInput,
  sessions: Session[] = fakeSessions,
  locations: Location[] = fakeLocations,
): CheckOutResult {
  // 1. buscar la sesión ABIERTA del participante (A3)
  const session = sessions.find(
    (s) => s.participantId === input.participantId && s.status === "open",
  );

  if (!session) {
    return { ok: false, reason: "no-open-session" };
  }

  // 2. validar GPS contra la location de la sesión (mismo Haversine)
  const location = locations.find((l) => l.id === session.locationId);

  if (!location) {
    return { ok: false, reason: "location-not-found" };
  }

  const distance = distanceInMeters(input.gps, location);

  if (distance > location.radiusMeters) {
    return { ok: false, reason: "out-of-radius" };
  }

  // 3. crear el evento de salida
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

  // 4. calcular horas trabajadas entre checkInAt y ahora
  const hoursWorked = hoursBetween(session.checkInAt, checkOutAt);

  // 5. cerrar la sesión (mutable — en el repository real sería un UPDATE)
  session.status = "closed";

  return { ok: true, event, hoursWorked };
}

// Diferencia en horas entre dos timestamps ISO
function hoursBetween(fromIso: string, toIso: string): number {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  return ms / (1000 * 60 * 60);
}