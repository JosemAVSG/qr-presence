import type {
  TenantRepository,
  QrRepository,
  LocationRepository,
  SessionRepository,
  EventRepository,
} from "../../src/repositories/ports.js";
import type { Tenant, Qr, Location, Session, AttendanceEvent } from "../../src/models/types.js";

// Implementaciones en memoria de los puertos.
// Los tests las usan para probar los services SIN DynamoDB.
// Mismo contrato (interface) que los adapters reales → intercambiables.

export class InMemoryTenantRepository implements TenantRepository {
  constructor(private readonly tenants: Tenant[] = []) {}

  async findById(id: string): Promise<Tenant | undefined> {
    return this.tenants.find((t) => t.id === id);
  }

  async save(tenant: Tenant): Promise<void> {
    this.tenants.push(tenant);
  }
}

export class InMemoryQrRepository implements QrRepository {
  constructor(private readonly qrs: Qr[] = []) {}

  async findByCode(code: string): Promise<Qr | undefined> {
    return this.qrs.find((q) => q.data === code);
  }

  async save(qr: Qr): Promise<void> {
    this.qrs.push(qr);
  }
}

export class InMemoryLocationRepository implements LocationRepository {
  constructor(private readonly locations: Location[] = []) {}

  async findById(tenantId: string, id: string): Promise<Location | undefined> {
    return this.locations.find((l) => l.tenantId === tenantId && l.id === id);
  }

  async save(location: Location): Promise<void> {
    this.locations.push(location);
  }
}

export class InMemorySessionRepository implements SessionRepository {
  constructor(private readonly sessions: Session[] = []) {}

  async findOpenByParticipant(participantId: string): Promise<Session | undefined> {
    return this.sessions.find((s) => s.participantId === participantId && s.status === "open");
  }

  async open(session: Session): Promise<void> {
    this.sessions.push(session);
  }

  async close(participantId: string): Promise<void> {
    const idx = this.sessions.findIndex(
      (s) => s.participantId === participantId && s.status === "open",
    );
    if (idx >= 0) this.sessions.splice(idx, 1);
  }
}

export class InMemoryEventRepository implements EventRepository {
  readonly events: AttendanceEvent[] = [];

  async save(event: AttendanceEvent): Promise<void> {
    this.events.push(event);
  }
}