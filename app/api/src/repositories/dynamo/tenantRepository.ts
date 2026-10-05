import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { Tenant } from "../../models/types.js";
import type { TenantRepository } from "../ports.js";
import { dynamo, TABLE_NAME } from "./client.js";

// T1: la configuración del tenant → PK = TENANT#id, SK = CONFIG
function toItem(tenant: Tenant) {
  return {
    PK: `TENANT#${tenant.id}`,
    SK: "CONFIG",
    ...tenant,
  };
}

function toDomain(item: Record<string, unknown>): Tenant {
  return {
    id: item.id as string,
    type: item.type as Tenant["type"],
    participantType: item.participantType as Tenant["participantType"],
    parentNotifications: item.parentNotifications as boolean,
    checkOut: item.checkOut as boolean,
  };
}

export class DynamoTenantRepository implements TenantRepository {
  async findById(id: string): Promise<Tenant | undefined> {
    const result = await dynamo.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `TENANT#${id}`, SK: "CONFIG" },
      }),
    );

    return result.Item ? toDomain(result.Item) : undefined;
  }

  async save(tenant: Tenant): Promise<void> {
    await dynamo.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: toItem(tenant),
      }),
    );
  }
}