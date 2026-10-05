import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// En local apuntamos a DynamoDB Local; en AWS el endpoint se omite.
const endpoint = process.env.DYNAMODB_ENDPOINT ?? "http://localhost:8000";

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