import { describe, expect, it } from "vitest";
import { checkIn } from "../src/services/checkIn.js";
import type { Qr } from "../src/models/types.js";

const baseInput = { qrCode: "ABC", participantId: "p-1" };

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

describe("checkIn", () => {
  it("rechaza un QR que no existe", () => {
    const result = checkIn({ ...baseInput, qrCode: "NO_EXISTE" }, [validQr]);

    expect(result).toEqual({ ok: false, reason: "qr-invalid" });
  });

  it("rechaza un QR inactivo", () => {
    const result = checkIn({ ...baseInput, qrCode: "INACTIVE" }, [validQr, inactiveQr]);

    expect(result).toEqual({ ok: false, reason: "qr-inactive" });
  });

  it("rechaza un QR expirado", () => {
    const result = checkIn({ ...baseInput, qrCode: "EXPIRED" }, [validQr, expiredQr]);

    expect(result).toEqual({ ok: false, reason: "qr-expired" });
  });

  it("acepta un QR válido y crea el evento", () => {
    const result = checkIn(baseInput, [validQr]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.event.participantId).toBe("p-1");
      expect(result.event.locationId).toBe("loc-1");
      expect(result.event.tenantId).toBe("t-1");
      expect(result.event.eventType).toBe("check-in");
      expect(result.event.id).toBeTruthy();
      expect(result.event.timestamp).toBeTruthy();
    }
  });
});