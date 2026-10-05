import { describe, expect, it } from "vitest";
import { checkIn } from "../src/services/checkIn.js";
import type { Qr, Location, Session } from "../src/models/types.js";
import {
  InMemoryQrRepository,
  InMemoryLocationRepository,
  InMemorySessionRepository,
  InMemoryEventRepository,
} from "./fakes/repositories.js";

const atLocation = { latitude: 40.7128, longitude: -74.006 };
const tooFar = { latitude: 40.72, longitude: -74.006 }; // ~800m

const validQr: Qr = {
  id: "qr-1",
  tenantId: "t-1",
  locationId: "loc-1",
  data: "ABC",
  expiresAt: "2030-01-01T00:00:00Z",
  active: true,
};

const inactiveQr: Qr = { ...validQr, id: "qr-2", data: "INACTIVE", active: false };

const expiredQr: Qr = {
  ...validQr,
  id: "qr-3",
  data: "EXPIRED",
  expiresAt: "2020-01-01T00:00:00Z",
};

const location: Location = {
  id: "loc-1",
  tenantId: "t-1",
  name: "Location 1",
  latitude: 40.7128,
  longitude: -74.006,
  radiusMeters: 100,
};

function makeDeps(qrs: Qr[], locations: Location[], sessions: Session[] = []) {
  return {
    qrRepo: new InMemoryQrRepository(qrs),
    locationRepo: new InMemoryLocationRepository(locations),
    sessionRepo: new InMemorySessionRepository(sessions),
    eventRepo: new InMemoryEventRepository(),
  };
}

describe("checkIn", () => {
  it("rechaza un QR que no existe", async () => {
    const deps = makeDeps([validQr], [location]);

    const result = await checkIn({ qrCode: "NO_EXISTE", participantId: "p-1", gps: atLocation }, deps);

    expect(result).toEqual({ ok: false, reason: "qr-invalid" });
  });

  it("rechaza un QR inactivo", async () => {
    const deps = makeDeps([validQr, inactiveQr], [location]);

    const result = await checkIn({ qrCode: "INACTIVE", participantId: "p-1", gps: atLocation }, deps);

    expect(result).toEqual({ ok: false, reason: "qr-inactive" });
  });

  it("rechaza un QR expirado", async () => {
    const deps = makeDeps([validQr, expiredQr], [location]);

    const result = await checkIn({ qrCode: "EXPIRED", participantId: "p-1", gps: atLocation }, deps);

    expect(result).toEqual({ ok: false, reason: "qr-expired" });
  });

  it("rechaza un check-in fuera del radio GPS", async () => {
    const deps = makeDeps([validQr], [location]);

    const result = await checkIn({ qrCode: "ABC", participantId: "p-1", gps: tooFar }, deps);

    expect(result).toEqual({ ok: false, reason: "out-of-radius" });
  });

  it("rechaza un segundo check-in si ya hay sesión abierta", async () => {
    const openSession: Session = {
      id: "s-1",
      tenantId: "t-1",
      participantId: "p-1",
      locationId: "loc-1",
      checkInAt: new Date().toISOString(),
      status: "open",
    };
    const deps = makeDeps([validQr], [location], [openSession]);

    const result = await checkIn({ qrCode: "ABC", participantId: "p-1", gps: atLocation }, deps);

    expect(result).toEqual({ ok: false, reason: "duplicate-check-in" });
  });

  it("acepta un check-in válido y abre la sesión", async () => {
    const deps = makeDeps([validQr], [location]);

    const result = await checkIn({ qrCode: "ABC", participantId: "p-1", gps: atLocation }, deps);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.event.participantId).toBe("p-1");
      expect(result.event.eventType).toBe("check-in");
      expect(result.event.gps).toEqual(atLocation);
      expect(result.session.status).toBe("open");
      expect(result.session.checkInAt).toBe(result.event.timestamp);
    }
    expect(deps.eventRepo.events).toHaveLength(1);
  });
});