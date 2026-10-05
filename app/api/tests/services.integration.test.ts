import { describe, expect, it } from "vitest";
import { checkIn } from "../src/services/checkIn.js";
import { checkOut } from "../src/services/checkOut.js";
import { DynamoTenantRepository } from "../src/repositories/dynamo/tenantRepository.js";
import { DynamoQrRepository } from "../src/repositories/dynamo/qrRepository.js";
import { DynamoLocationRepository } from "../src/repositories/dynamo/locationRepository.js";
import { DynamoSessionRepository } from "../src/repositories/dynamo/sessionRepository.js";
import { DynamoEventRepository } from "../src/repositories/dynamo/eventRepository.js";
import type { Tenant, Qr, Location } from "../src/models/types.js";

// End-to-end: services + repositorios DynamoDB reales.
// Requiere DynamoDB Local + tabla creada. Correr con: npm run test:integration

const tenantRepo = new DynamoTenantRepository();
const qrRepo = new DynamoQrRepository();
const locationRepo = new DynamoLocationRepository();
const sessionRepo = new DynamoSessionRepository();
const eventRepo = new DynamoEventRepository();

const atLocation = { latitude: 40.7128, longitude: -74.006 };

describe("check-in + check-out end-to-end (integration)", () => {
  it("entra y sale, cerrando la sesión y calculando horas", async () => {
    // seed: tenant (con check-out), QR y location
    const tenant: Tenant = {
      id: "t-e2e",
      type: "workplace",
      participantType: "employee",
      parentNotifications: false,
      checkOut: true,
    };
    const qr: Qr = {
      id: "qr-e2e",
      tenantId: "t-e2e",
      locationId: "loc-e2e",
      data: "E2E-CODE",
      expiresAt: "2030-01-01T00:00:00Z",
      active: true,
    };
    const location: Location = {
      id: "loc-e2e",
      tenantId: "t-e2e",
      name: "E2E Location",
      latitude: 40.7128,
      longitude: -74.006,
      radiusMeters: 100,
    };
    await tenantRepo.save(tenant);
    await qrRepo.save(qr);
    await locationRepo.save(location);
    await sessionRepo.close("p-e2e"); // limpieza por si quedó abierta

    const checkInDeps = { qrRepo, locationRepo, sessionRepo, eventRepo };
    const checkOutDeps = { tenantRepo, sessionRepo, locationRepo, eventRepo };

    const inResult = await checkIn(
      { qrCode: "E2E-CODE", participantId: "p-e2e", gps: atLocation },
      checkInDeps,
    );
    expect(inResult.ok).toBe(true);

    const outResult = await checkOut({ participantId: "p-e2e", gps: atLocation }, checkOutDeps);
    expect(outResult.ok).toBe(true);

    const openAfter = await sessionRepo.findOpenByParticipant("p-e2e");
    expect(openAfter).toBeUndefined();
  });

  it("rechaza un check-in fuera del radio contra DynamoDB", async () => {
    const farAway = { latitude: 40.75, longitude: -74.006 };
    const checkInDeps = { qrRepo, locationRepo, sessionRepo, eventRepo };

    const result = await checkIn(
      { qrCode: "E2E-CODE", participantId: "p-e2e-far", gps: farAway },
      checkInDeps,
    );

    expect(result).toEqual({ ok: false, reason: "out-of-radius" });
  });
});