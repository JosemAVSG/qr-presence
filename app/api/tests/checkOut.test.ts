import { describe, expect, it } from "vitest";
import { checkOut } from "../src/services/checkOut.js";
import type { Tenant, Location, Session } from "../src/models/types.js";
import {
  InMemoryTenantRepository,
  InMemoryLocationRepository,
  InMemorySessionRepository,
  InMemoryEventRepository,
} from "./fakes/repositories.js";

const atLocation = { latitude: 40.7128, longitude: -74.006 };
const tooFar = { latitude: 40.72, longitude: -74.006 };

const workplaceTenant: Tenant = {
  id: "t-1",
  type: "workplace",
  participantType: "employee",
  parentNotifications: false,
  checkOut: true,
};

const schoolTenant: Tenant = {
  id: "t-1",
  type: "school",
  participantType: "student",
  parentNotifications: true,
  checkOut: false, // una escuela no hace check-out
};

const location: Location = {
  id: "loc-1",
  tenantId: "t-1",
  name: "Location 1",
  latitude: 40.7128,
  longitude: -74.006,
  radiusMeters: 100,
};

function makeOpenSession(): Session {
  return {
    id: "session-1",
    tenantId: "t-1",
    participantId: "p-1",
    locationId: "loc-1",
    checkInAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // hace 1 hora
    status: "open",
  };
}

function makeDeps(
  sessions: Session[],
  tenant: Tenant = workplaceTenant,
  locations: Location[] = [location],
) {
  return {
    tenantRepo: new InMemoryTenantRepository([tenant]),
    sessionRepo: new InMemorySessionRepository(sessions),
    locationRepo: new InMemoryLocationRepository(locations),
    eventRepo: new InMemoryEventRepository(),
  };
}

describe("checkOut", () => {
  it("rechaza si el participante no tiene sesión abierta", async () => {
    const deps = makeDeps([]);

    const result = await checkOut({ participantId: "p-999", gps: atLocation }, deps);

    expect(result).toEqual({ ok: false, reason: "no-open-session" });
  });

  it("rechaza si el tenant no permite check-out (escuela)", async () => {
    const deps = makeDeps([makeOpenSession()], schoolTenant);

    const result = await checkOut({ participantId: "p-1", gps: atLocation }, deps);

    expect(result).toEqual({ ok: false, reason: "checkout-not-enabled" });
  });

  it("rechaza si está fuera del radio GPS", async () => {
    const deps = makeDeps([makeOpenSession()]);

    const result = await checkOut({ participantId: "p-1", gps: tooFar }, deps);

    expect(result).toEqual({ ok: false, reason: "out-of-radius" });
  });

  it("cierra la sesión y calcula las horas trabajadas", async () => {
    const deps = makeDeps([makeOpenSession()]);

    const result = await checkOut({ participantId: "p-1", gps: atLocation }, deps);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.event.eventType).toBe("check-out");
      expect(result.hoursWorked).toBeGreaterThan(0.9);
      expect(result.hoursWorked).toBeLessThan(1.1);
    }
    const stillOpen = await deps.sessionRepo.findOpenByParticipant("p-1");
    expect(stillOpen).toBeUndefined();
    expect(deps.eventRepo.events).toHaveLength(1);
  });
});