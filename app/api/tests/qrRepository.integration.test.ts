import { describe, expect, it } from "vitest";
import { DynamoQrRepository } from "../src/repositories/dynamo/qrRepository.js";
import type { Qr } from "../src/models/types.js";

// Requiere DynamoDB Local corriendo en localhost:8000 + la tabla creada.
// Correr con: npm run test:integration
const repo = new DynamoQrRepository();

const qr: Qr = {
  id: "qr-int-1",
  tenantId: "t-int",
  locationId: "loc-int",
  data: "INTEGRATION-CODE",
  expiresAt: "2030-01-01T00:00:00Z",
  active: true,
};

describe("DynamoQrRepository (integration)", () => {
  it("guarda y encuentra un QR por su código", async () => {
    await repo.save(qr);

    const found = await repo.findByCode("INTEGRATION-CODE");

    expect(found).toEqual(qr);
  });

  it("devuelve undefined si el código no existe", async () => {
    const found = await repo.findByCode("NO-EXISTE");

    expect(found).toBeUndefined();
  });
});