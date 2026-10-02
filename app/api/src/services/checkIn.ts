import type { Qr, AttendanceEvent, Location } from "../models/types.js";

interface CheckInInput {
  qrCode: string; // lo que escaneó
  participantId: string; // quién escanea
  gps: { latitude: number; longitude: number }; // dónde está parado
}

type CheckInResult =
  | { ok: true; event: AttendanceEvent }
  | { ok: false; reason: "qr-invalid" | "qr-expired" | "qr-inactive" | "out-of-radius" };

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

export function checkIn(
  input: CheckInInput,
  qrs: Qr[] = fakeQrs,
  locations: Location[] = fakeLocations,
): CheckInResult {
  // 1. buscar el QR por su contenido
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

  // 2. validación GPS: la location del QR + distancia vs radio
  const location = locations.find((l) => l.id === qrFound.locationId);

  if (!location) {
    return { ok: false, reason: "qr-invalid" };
  }

  const distance = distanceInMeters(input.gps, location);

  if (distance > location.radiusMeters) {
    return { ok: false, reason: "out-of-radius" };
  }

  // 3. si pasa todo → crear el evento con el GPS real
  const event: AttendanceEvent = {
    id: crypto.randomUUID(),
    tenantId: qrFound.tenantId,
    participantId: input.participantId,
    locationId: qrFound.locationId,
    eventType: "check-in",
    timestamp: new Date().toISOString(),
    gps: input.gps,
  };

  return { ok: true, event };
}

// Distancia entre dos puntos GPS sobre la esfera terrestre (Haversine), en metros
function distanceInMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const R = 6371000; // radio de la Tierra en metros
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
}