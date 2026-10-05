import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { Qr } from "../../models/types.js";
import type { QrRepository } from "../ports.js";
import { dynamo, TABLE_NAME } from "./client.js";

// Mapeo dominio ↔ DynamoDB.
// El código escaneado ES la clave: PK = QR#<code>.
// GSI1 alimenta Q2 (QR vigente por location).
function toItem(qr: Qr) {
  return {
    PK: `QR#${qr.data}`,
    SK: "METADATA",
    GSI1PK: `LOCATION#${qr.locationId}`,
    GSI1SK: `QR#${qr.expiresAt}`,
    ...qr,
  };
}

function toDomain(item: Record<string, unknown>): Qr {
  return {
    id: item.id as string,
    tenantId: item.tenantId as string,
    locationId: item.locationId as string,
    data: item.data as string,
    expiresAt: item.expiresAt as string,
    active: item.active as boolean,
  };
}

export class DynamoQrRepository implements QrRepository {
  async findByCode(code: string): Promise<Qr | undefined> {
    const result = await dynamo.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `QR#${code}`, SK: "METADATA" },
      }),
    );

    return result.Item ? toDomain(result.Item) : undefined;
  }

  async save(qr: Qr): Promise<void> {
    await dynamo.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: toItem(qr),
      }),
    );
  }
}