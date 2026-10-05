import { describe, expect, it } from "vitest";
import { DynamoTenantRepository } from "../src/repositories/dynamo/tenantRepository.js";
import { DynamoLocationRepository } from "../src/repositories/dynamo/locationRepository.js";
import { DynamoSessionRepository } from "../src/repositories/dynamo/sessionRepository.js";
import { DynamoEventRepository } from "../src/repositories/dynamo/eventRepository.js";
import type { Tenant, Location, Session, AttendanceEvent } from "../src/models/types.js";

// Requiere DynamoDB Local corriendo en localhost:8000 + la tabla creada.
// Correr con: npm run test:integration

const tenantRepo = new DynamoTenantRepository();
const locationRepo = new DynamoLocationRepository();
const sessionRepo = new DynamoSessionRepository();
const eventRepo = new DynamoEventRepository();

describe("DynamoTenantRepository (integration)", () => {
  it("guarda y encuentra la configuración de un tenant", async () => {
    const tenant: Tenant = {
      id: "t-int-cfg",
      type: "workplace",
      participantType: "employee",
      parentNotifications: false,
      checkOut: true,
    };

    await tenantRepo.save(tenant);
    const found = await tenantRepo.findById("t-int-cfg");

    expect(found).toEqual(tenant);
  });
});

describe("DynamoLocationRepository (integration)", () => {
  it("guarda y encuentra una location por tenant + id", async () => {
    const location: Location = {
      id: "loc-int",
      tenantId: "t-int",
      name: "Location Integration",
      latitude: 40.7128,
      longitude: -74.006,
      radiusMeters: 100,
    };

    await locationRepo.save(location);
    const found = await locationRepo.findById("t-int", "loc-int");

    expect(found).toEqual(location);
  });
});

describe("DynamoSessionRepository (integration)", () => {
  it("abre, encuentra y cierra una sesión", async () => {
    const session: Session = {
      id: "s-int",
      tenantId: "t-int",
      participantId: "p-int",
      locationId: "loc-int",
      checkInAt: new Date().toISOString(),
      status: "open",
    };

    await sessionRepo.open(session);
    const open = await sessionRepo.findOpenByParticipant("p-int");
    expect(open).toEqual(session);

    await sessionRepo.close("p-int");
    const closed = await sessionRepo.findOpenByParticipant("p-int");
    expect(closed).toBeUndefined();
  });
});

describe("DynamoEventRepository (integration)", () => {
  it("guarda un evento de asistencia", async () => {
    const event: AttendanceEvent = {
      id: "e-int",
      tenantId: "t-int",
      participantId: "p-int",
      locationId: "loc-int",
      eventType: "check-in",
      timestamp: new Date().toISOString(),
      gps: { latitude: 40.7128, longitude: -74.006 },
    };

    await expect(eventRepo.save(event)).resolves.toBeUndefined();
  });
});