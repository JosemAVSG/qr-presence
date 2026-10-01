import type { Qr, AttendanceEvent } from "../models/types.js";

interface CheckInInput {
  qrCode: string; // lo que escaneó
  participantId: string; // quién escanea
  // gps: { latitude: number; longitude: number }; // dónde está parado
}

type CheckInResult =
  | { ok: true; event: AttendanceEvent }
  | { ok: false; reason: "qr-invalid" | "qr-expired" | "qr-inactive" };

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

export function checkIn(input: CheckInInput, qrs: Qr[] = fakeQrs): CheckInResult {
  // 1. buscar el QR por su contenido
  const qrFound = qrs.find((q) => q.data === input.qrCode);

  if (!qrFound) {
    return { ok: false, reason: "qr-invalid" };
  }

  if (qrFound.active === false) {
    return { ok: false, reason: "qr-inactive" };
  }

  if (qrFound.expiresAt < new Date().toISOString()) {
    return { ok: false, reason: "qr-expired" };
  }
  const event: AttendanceEvent = {
    id: crypto.randomUUID(),
    tenantId: qrFound.tenantId,
    participantId: input.participantId,
    locationId: qrFound.locationId,
    eventType: "check-in",
    timestamp: new Date().toISOString(),
    gps: { latitude: 0, longitude: 0 },
  };

  return { ok: true, event };
}
