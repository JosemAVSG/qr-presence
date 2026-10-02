import { describe, expect, it } from "vitest";
import { checkIn } from "../src/services/checkIn.js";
import type { Qr, Location } from "../src/models/types.js";

// GPS de la location loc-1: (40.7128, -74.006) con radio 100m
const atLocation = { latitude: 40.7128, longitude: -74.006 };
const farAway = { latitude: 40.7135, longitude: -74.006 }; // ~78m... depende
const tooFar = { latitude: 40.72, longitude: -74.006 }; // ~800m

const baseInput = { qrCode: "ABC", participantId: "p-1", gps: atLocation };

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

describe("checkIn", () => {
  it("rechaza un QR que no existe", () => {
    const result = checkIn({ ...baseInput, qrCode: "NO_EXISTE" }, [validQr], [location]);

    expect(result).toEqual({ ok: false, reason: "qr-invalid" });
  });

  it("rechaza un QR inactivo", () => {
    const result = checkIn({ ...baseInput, qrCode: "INACTIVE" }, [validQr, inactiveQr], [location]);

    expect(result).toEqual({ ok: false, reason: "qr-inactive" });
  });

  it("rechaza un QR expirado", () => {
    const result = checkIn({ ...baseInput, qrCode: "EXPIRED" }, [validQr, expiredQr], [location]);

    expect(result).toEqual({ ok: false, reason: "qr-expired" });
  });

  it("rechaza un check-in fuera del radio GPS", () => {
    const result = checkIn({ ...baseInput, gps: tooFar }, [validQr], [location]);

    expect(result).toEqual({ ok: false, reason: "out-of-radius" });
  });

  it("acepta un check-in dentro del radio", () => {
    const result = checkIn({ ...baseInput, gps: atLocation }, [validQr], [location]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.event.participantId).toBe("p-1");
      expect(result.event.locationId).toBe("loc-1");
      expect(result.event.eventType).toBe("check-in");
      expect(result.event.gps).toEqual(atLocation);
    }
  });
});