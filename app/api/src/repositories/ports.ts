import type { Qr, Location, Session, AttendanceEvent, Tenant } from "../models/types.js";

// Puertos (ports): contratos que los services usan.
// NO saben nada de DynamoDB — solo describen QUÉ se puede pedir.
// Los adapters (dynamo/*) los implementan; los tests usan versiones en memoria.

export interface TenantRepository {
  findById(id: string): Promise<Tenant | undefined>;
  save(tenant: Tenant): Promise<void>;
}

export interface QrRepository {
  findByCode(code: string): Promise<Qr | undefined>;
  save(qr: Qr): Promise<void>;
}

export interface LocationRepository {
  // findById recibe tenantId porque la PK de Location es TENANT#id (diseño del doc).
  // Bonus: fuerza el scoping por tenant — un tenant no puede leer datos de otro.
  findById(tenantId: string, id: string): Promise<Location | undefined>;
  save(location: Location): Promise<void>;
}

export interface SessionRepository {
  findOpenByParticipant(participantId: string): Promise<Session | undefined>;
  open(session: Session): Promise<void>;
  close(participantId: string): Promise<void>;
}

export interface EventRepository {
  save(event: AttendanceEvent): Promise<void>;
}