import { DynamoTenantRepository } from "../repositories/dynamo/tenantRepository.js";
import { DynamoQrRepository } from "../repositories/dynamo/qrRepository.js";
import { DynamoLocationRepository } from "../repositories/dynamo/locationRepository.js";
import { DynamoSessionRepository } from "../repositories/dynamo/sessionRepository.js";
import { DynamoEventRepository } from "../repositories/dynamo/eventRepository.js";
import type { CheckInDeps } from "../services/checkIn.js";
import type { CheckOutDeps } from "../services/checkOut.js";

// Wiring: instancia los adapters reales (DynamoDB) y los conecta a los services.
// Los handlers de producción usan estos; los tests inyectan fakes.
const qrRepo = new DynamoQrRepository();
const locationRepo = new DynamoLocationRepository();
const sessionRepo = new DynamoSessionRepository();
const eventRepo = new DynamoEventRepository();
const tenantRepo = new DynamoTenantRepository();

export const checkInDeps: CheckInDeps = { qrRepo, locationRepo, sessionRepo, eventRepo };

export const checkOutDeps: CheckOutDeps = { tenantRepo, sessionRepo, locationRepo, eventRepo };