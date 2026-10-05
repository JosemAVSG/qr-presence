import { describe, expect, it } from "vitest";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { makeCheckInHandler } from "../src/handlers/checkIn.js";
import { makeCheckOutHandler } from "../src/handlers/checkOut.js";
import type { Tenant, Qr, Location } from "../src/models/types.js";
import {
  InMemoryTenantRepository,
  InMemoryQrRepository,
  InMemoryLocationRepository,
  InMemorySessionRepository,
  InMemoryEventRepository,
} from "./fakes/repositories.js";

const atLocation = { latitude: 40.7128, longitude: -74.006 };

const tenant: Tenant = {
  id: "t-1",
  type: "workplace",
  participantType: "employee",
  parentNotifications: false,
  checkOut: true,
};

const qr: Qr = {
  id: "qr-1",
  tenantId: "t-1",
  locationId: "loc-1",
  data: "ABC",
  expiresAt: "2030-01-01T00:00:00Z",
  active: true,
};

const location: Location = {
  id: "loc-1",
  tenantId: "t-1",
  name: "Location 1",
  latitude: 40.7128,
  longitude: -74.006,
  radiusMeters: 100,
};

// Construye un evento de API Gateway con un body JSON dado.
function httpEvent(body: unknown): APIGatewayProxyEventV2 {
  return { body: typeof body === "string" ? body : JSON.stringify(body) } as APIGatewayProxyEventV2;
}

describe("handler check-in", () => {
  it("responde 201 con el evento y la sesión", async () => {
    const handler = makeCheckInHandler({
      qrRepo: new InMemoryQrRepository([qr]),
      locationRepo: new InMemoryLocationRepository([location]),
      sessionRepo: new InMemorySessionRepository(),
      eventRepo: new InMemoryEventRepository(),
    });

    const response = await handler(
      httpEvent({ qrCode: "ABC", participantId: "p-1", gps: atLocation }),
    );

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body as string);
    expect(body.event.eventType).toBe("check-in");
    expect(body.session.status).toBe("open");
  });

  it("responde 400 con el motivo cuando el QR no existe", async () => {
    const handler = makeCheckInHandler({
      qrRepo: new InMemoryQrRepository([qr]),
      locationRepo: new InMemoryLocationRepository([location]),
      sessionRepo: new InMemorySessionRepository(),
      eventRepo: new InMemoryEventRepository(),
    });

    const response = await handler(
      httpEvent({ qrCode: "NO_EXISTE", participantId: "p-1", gps: atLocation }),
    );

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body as string)).toEqual({ reason: "qr-invalid" });
  });

  it("responde 400 si el body no es JSON válido", async () => {
    const handler = makeCheckInHandler({
      qrRepo: new InMemoryQrRepository([qr]),
      locationRepo: new InMemoryLocationRepository([location]),
      sessionRepo: new InMemorySessionRepository(),
      eventRepo: new InMemoryEventRepository(),
    });

    const response = await handler(httpEvent("{ esto no es json"));

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body as string)).toEqual({ reason: "invalid-body" });
  });
});

describe("handler check-out", () => {
  it("responde 400 si no hay sesión abierta", async () => {
    const handler = makeCheckOutHandler({
      tenantRepo: new InMemoryTenantRepository([tenant]),
      sessionRepo: new InMemorySessionRepository(),
      locationRepo: new InMemoryLocationRepository([location]),
      eventRepo: new InMemoryEventRepository(),
    });

    const response = await handler(httpEvent({ participantId: "p-1", gps: atLocation }));

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body as string)).toEqual({ reason: "no-open-session" });
  });
});