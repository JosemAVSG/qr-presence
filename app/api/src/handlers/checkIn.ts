import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { checkIn, type CheckInDeps, type CheckInInput } from "../services/checkIn.js";
import { checkInDeps as defaultDeps } from "./deps.js";

// Factory: permite inyectar dependencias (tests con fakes, prod con DynamoDB).
export function makeCheckInHandler(deps: CheckInDeps) {
  return async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    // 1. parsear el body (la capa HTTP es la única que sabe de strings JSON)
    let input: CheckInInput;
    try {
      input = JSON.parse(event.body ?? "{}");
    } catch {
      return { statusCode: 400, body: JSON.stringify({ reason: "invalid-body" }) };
    }

    // 2. delegar toda la decisión al service
    const result = await checkIn(input, deps);

    // 3. traducir el resultado del dominio a HTTP
    if (!result.ok) {
      return { statusCode: 400, body: JSON.stringify({ reason: result.reason }) };
    }

    return {
      statusCode: 201,
      body: JSON.stringify({ event: result.event, session: result.session }),
    };
  };
}

// Handler de producción, con los repositorios reales conectados.
export const handler = makeCheckInHandler(defaultDeps);