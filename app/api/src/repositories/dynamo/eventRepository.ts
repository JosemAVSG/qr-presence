import { PutCommand } from "@aws-sdk/lib-dynamodb";
import type { AttendanceEvent } from "../../models/types.js";
import type { EventRepository } from "../ports.js";
import { dynamo, TABLE_NAME } from "./client.js";

// A1/A2: los eventos viven bajo el participante → PK = PARTICIPANT#id, SK = EVENT#timestamp.
// GSI1 desnormaliza la location para reportes (A4, R1, R3, R4).
function toItem(event: AttendanceEvent) {
  return {
    PK: `PARTICIPANT#${event.participantId}`,
    SK: `EVENT#${event.timestamp}`,
    GSI1PK: `LOCATION#${event.locationId}`,
    GSI1SK: `EVENT#${event.timestamp}`,
    ...event,
  };
}

export class DynamoEventRepository implements EventRepository {
  async save(event: AttendanceEvent): Promise<void> {
    await dynamo.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: toItem(event),
      }),
    );
  }
}