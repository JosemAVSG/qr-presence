import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { Location } from "../../models/types.js";
import type { LocationRepository } from "../ports.js";
import { dynamo, TABLE_NAME } from "./client.js";

// T2: las locations viven bajo el tenant → PK = TENANT#id, SK = LOCATION#id
function toItem(location: Location) {
  return {
    PK: `TENANT#${location.tenantId}`,
    SK: `LOCATION#${location.id}`,
    ...location,
  };
}

function toDomain(item: Record<string, unknown>): Location {
  return {
    id: item.id as string,
    tenantId: item.tenantId as string,
    name: item.name as string,
    latitude: item.latitude as number,
    longitude: item.longitude as number,
    radiusMeters: item.radiusMeters as number,
  };
}

export class DynamoLocationRepository implements LocationRepository {
  async findById(tenantId: string, id: string): Promise<Location | undefined> {
    const result = await dynamo.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `TENANT#${tenantId}`, SK: `LOCATION#${id}` },
      }),
    );

    return result.Item ? toDomain(result.Item) : undefined;
  }

  async save(location: Location): Promise<void> {
    await dynamo.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: toItem(location),
      }),
    );
  }
}