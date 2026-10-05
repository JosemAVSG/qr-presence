import { DeleteCommand, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { Session } from "../../models/types.js";
import type { SessionRepository } from "../ports.js";
import { dynamo, TABLE_NAME } from "./client.js";

// A3: la sesión abierta vive bajo el participante → PK = PARTICIPANT#id, SK = SESSION#OPEN.
// Como el SK codifica "OPEN", cerrar = BORRAR el ítem (no hay estado "closed" en storage).
const SK_OPEN = "SESSION#OPEN";

function toItem(session: Session) {
  return {
    PK: `PARTICIPANT#${session.participantId}`,
    SK: SK_OPEN,
    // R4: presentes por location → GSI1 (LOCATION#id → SESSION#OPEN)
    GSI1PK: `LOCATION#${session.locationId}`,
    GSI1SK: SK_OPEN,
    ...session,
  };
}

function toDomain(item: Record<string, unknown>): Session {
  return {
    id: item.id as string,
    tenantId: item.tenantId as string,
    participantId: item.participantId as string,
    locationId: item.locationId as string,
    checkInAt: item.checkInAt as string,
    status: item.status as "open" | "closed",
  };
}

export class DynamoSessionRepository implements SessionRepository {
  async findOpenByParticipant(participantId: string): Promise<Session | undefined> {
    const result = await dynamo.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `PARTICIPANT#${participantId}`, SK: SK_OPEN },
      }),
    );

    return result.Item ? toDomain(result.Item) : undefined;
  }

  async open(session: Session): Promise<void> {
    await dynamo.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: toItem(session),
      }),
    );
  }

  async close(participantId: string): Promise<void> {
    await dynamo.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { PK: `PARTICIPANT#${participantId}`, SK: SK_OPEN },
      }),
    );
  }
}