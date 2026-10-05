import { describe, expect, it } from "vitest";
import { checkOut } from "../src/services/checkOut.js";
import type { Location, Session } from "../src/models/types.js";

const atLocation = { latitude: 40.7128, longitude: -74.006 };
const tooFar = { latitude: 40.72, longitude: -74.006 };

const location: Location = {
  id: "loc-1",
  tenantId: "t-1",
  name: "Location 1",
  latitude: 40.7128,
  longitude: -74.006,
  radiusMeters: 100,
};

const openSession: Session = {
  id: "session-1",
  tenantId: "t-1",
  participantId: "p-1",
  locationId: "loc-1",
  checkInAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // hace 1 hora
  status: "open",
};

describe("checkOut", () => {
  it("rechaza si el participante no tiene sesión abierta", () => {
    const result = checkOut({ participantId: "p-999", gps: atLocation }, [openSession], [location]);

    expect(result).toEqual({ ok: false, reason: "no-open-session" });
  });

  it("rechaza si está fuera del radio GPS", () => {
    const result = checkOut({ participantId: "p-1", gps: tooFar }, [openSession], [location]);

    expect(result).toEqual({ ok: false, reason: "out-of-radius" });
  });

  it("cierra la sesión y calcula las horas trabajadas", () => {
    const session = { ...openSession };
    const result = checkOut({ participantId: "p-1", gps: atLocation }, [session], [location]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.event.eventType).toBe("check-out");
      expect(result.hoursWorked).toBeGreaterThan(0);
    }
    expect(session.status).toBe("closed");
  });
});