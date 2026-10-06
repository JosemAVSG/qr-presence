import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Local: apuntamos al emulador floci (un solo entorno para todo).
// En AWS: dejar DYNAMODB_ENDPOINT vacío para que el SDK resuelva el endpoint real.
const endpoint = process.env.DYNAMODB_ENDPOINT ?? "http://localhost:4566";

export const TABLE_NAME = process.env.TABLE_NAME ?? "qr-presence";

export const dynamo = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    endpoint,
    region: process.env.AWS_REGION ?? "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "local",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "local",
    },
  }),
);