import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { checkOut, type CheckOutDeps, type CheckOutInput } from "../services/checkOut.js";
import { checkOutDeps as defaultDeps } from "./deps.js";

// Factory: permite inyectar dependencias (tests con fakes, prod con DynamoDB).
export function makeCheckOutHandler(deps: CheckOutDeps) {
  return async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    // 1. parsear el body
    let input: CheckOutInput;
    try {
      input = JSON.parse(event.body ?? "{}");
    } catch {
      return { statusCode: 400, body: JSON.stringify({ reason: "invalid-body" }) };
    }

    // 2. delegar la decisión al service
    const result = await checkOut(input, deps);

    // 3. traducir el resultado a HTTP
    if (!result.ok) {
      return { statusCode: 400, body: JSON.stringify({ reason: result.reason }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ event: result.event, hoursWorked: result.hoursWorked }),
    };
  };
}

// Handler de producción, con los repositorios reales conectados.
export const handler = makeCheckOutHandler(defaultDeps);