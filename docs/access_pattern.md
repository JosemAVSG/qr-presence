# QR Presence — Modelo de Dominio y Access Patterns

> Documento de diseño v1 — define qué necesita saber el sistema antes de diseñar DynamoDB.
> Orden de trabajo: modelo de dominio → access patterns → diseño de PK/SK → Lambda/API.

## 1. Modelo de dominio

Un solo motor de asistencia que sirve dos verticales (escuelas y lugares de trabajo). Lo que cambia entre verticales es la **política del tenant** y el **tipo de participante**, no el motor.

### Entidades

#### Tenant
Organización que usa el sistema (escuela, alcaldía, empresa). Define tipo, funcionalidades habilitadas y política.

#### Participant
Persona que registra asistencia. Subtipos: `Employee` (vertical trabajo) y `Student` (vertical escuela).

#### Location
Ubicación física con perímetro GPS donde se registra asistencia (aula, oficina, puerta).

#### QR
Código rotativo asociado a un tenant + location. Tiene vigencia y expiración.

#### AttendanceEvent
Evento de asistencia: check-in / check-out / present. Inmutable, con timestamp y GPS.

#### AuditEvent
Intento de asistencia registrado, **incluidos los rechazados**, con motivo. Base de auditoría y observabilidad.

### Configuración de tenant (ejemplo conceptual)

```json
{
  "tenantId": "school_001",
  "type": "school",
  "participantType": "student",
  "parentNotifications": true,
  "checkOut": false
}
```

```json
{
  "tenantId": "municipality_001",
  "type": "workplace",
  "participantType": "employee",
  "parentNotifications": false,
  "checkOut": true
}
```

### Flujo de validación de un QR

```
QR válido
  → identificar organización
  → identificar ubicación
  → identificar participante
  → validar GPS (distancia al perímetro)
  → registrar AttendanceEvent
```

## 2. Access Patterns

Formato: **dado X → obtener Y**. Cada patrón debe resolverse con un query puntual en DynamoDB (PK/SK/GSI), nunca con un scan.

### Tenant

- **T1** — Dado `tenantId` → obtener su configuración (tipo, política, funcionalidades habilitadas)
- **T2** — Dado `tenantId` → obtener sus locations

### Participant

- **P1** — Dado `participantId` → obtener datos del participante (activo, tenant, departamento/sección)
- **P2** — Dado `tenantId` + `departmentId` → obtener los participantes de ese grupo

### QR

- **Q1** — Dado `qrId` → obtener QR (tenant, location, vigencia, expiración, estado)
- **Q2** — Dado `locationId` → obtener el QR vigente actual de esa ubicación

### Attendance / Events

- **A1** — Dado `participantId` + `date` → obtener eventos del día (check-in, check-out, present)
- **A2** — Dado `participantId` + rango de tiempo → obtener historial de eventos
- **A3** — Dado `participantId` → obtener sesión abierta (check-in sin check-out), para calcular horas
- **A4** — Dado `locationId` + rango de tiempo → obtener eventos de ese lugar (reporte del día)
- **A5** — Dado `participantId` + rango (semana/mes) → agregación de horas trabajadas

### Audit

- **AU1** — Dado `locationId` + rango de tiempo → obtener intentos rechazados con motivo (QR expirado, fuera de radio, check-in duplicado, etc.)

## 3. Reportes (consultas, no datos)

Los reportes NO son una entidad — son **agregaciones sobre AttendanceEvent**. Se resuelven con GSI + agregación en Lambda, no con ítems "Report" en la tabla.

- **R1** — Dado `tenantId` + `date` → quién hizo check-in hoy
- **R2** — Dado `tenantId` + `date` → quién todavía no hizo check-in
- **R3** — Dado `tenantId` + `date` → quién llegó tarde / salió temprano
- **R4** — Dado `tenantId` + `departmentId` + `date` → quién está presente ahora
- **R5** — Dado `tenantId` + rango → resumen de asistencia del período

## 4. Diseño single-table (PK/SK/GSI)

Traducción de los access patterns a claves de DynamoDB. Un GSI sirve a varios patrones; no se crea un índice por consulta.

### Tabla resuelta

| Pattern                       | PK                 | SK                | GSI       |
| ----------------------------- | ------------------ | ----------------- | --------- |
| T1 Tenant config              | `TENANT#id`        | `CONFIG`          | —         |
| T2 Tenant locations           | `TENANT#id`        | `LOCATION#id`     | —         |
| P1 Participant                | `PARTICIPANT#id`   | `PROFILE`         | —         |
| P2 Participants by department | —                  | —                 | **GSI-A** |
| Q1 QR                         | `QR#id`            | `METADATA`        | —         |
| Q2 Current QR                 | —                  | —                 | **GSI-B** |
| A1 Events by participant/day  | `PARTICIPANT#id`   | `EVENT#timestamp` | —         |
| A2 Events by range            | `PARTICIPANT#id`   | `EVENT#timestamp` | —         |
| A3 Open session               | `PARTICIPANT#id`   | `SESSION#OPEN`    | —         |
| A4 Events by location         | —                  | —                 | **GSI-B** |
| R1 Check-ins today            | —                  | —                 | **GSI-B** |
| R2 Missing today              | ⚠️ resta en Lambda | —                 | —         |
| R3 Late / early exit          | —                  | —                 | **GSI-B** |
| R4 Present now                | —                  | —                 | **GSI-B** |

### Índices secundarios (solo 2)

| GSI | PK | SK | Sirve a |
| --- | --- | --- | --- |
| **GSI-A** | `DEPT#tenantId#departmentId` | `PARTICIPANT#id` | P2 |
| **GSI-B** | `LOCATION#id#YYYY-MM-DD` | polimórfica: `EVENT#timestamp` / `SESSION#OPEN` / `QR#rotatedAt` | Q2, A4, R1, R3, R4 |

### Atributos requeridos en los ítems (desnormalización)

- El ítem `PARTICIPANT#id/PROFILE` debe llevar `departmentId` → alimenta GSI-A.
- El ítem de evento (`EVENT#timestamp`) debe llevar `locationId` + `dateKey` (YYYY-MM-DD) y `eventType` (check-in / check-out / present) → alimenta GSI-B (PK por día).
- El ítem `QR#id/METADATA` debe llevar `locationId`, `dateKey`, `rotatedAt` y `expiresAt` → alimenta GSI-B (Q2: QR vigente por location).
- El ítem `SESSION#OPEN` debe llevar `locationId` y `dateKey` → alimenta GSI-B (R4: presentes por location).

### Notas de diseño

- **A1 = A2**: el mismo patrón; "por día" es un rango de timestamps sobre la misma clave.
- **GSI-B particionado por día (decisión D5)**: PK `LOCATION#id#YYYY-MM-DD`. Todas las queries diarias (R1/R3/R4 = hoy; A4 = el día) viven en la partición del día; un rango multi-día son N queries + merge en Lambda. Evita hot partition y no cuesta nada operativamente.
- **La SK de GSI-B es polimórfica**: cada tipo de ítem usa su prefijo (`EVENT#ts`, `SESSION#OPEN`, `QR#rotatedAt`); cada patrón consulta con `begins_with`.
- **R2 (missing today) NO es un query directo**: es una resta en Lambda — participantes del departamento (P2) menos los que ya tienen evento hoy (R1). No todo access pattern es un query.
- **R4 se resuelve con GSI-B**: ítems `SESSION#OPEN` bajo el PK del día de hoy (nadie está "presente ayer"), filtrados por departamento.
- **A3 es un ítem mutable**: se crea en check-in, se borra en check-out (decisión D1: estado mutable + GSI). El cierre forzado lo hace el job de cierre (D4); TTL por duración (`check-in + 26h`) es solo safety net si el job falla (D3). Como R4 consulta solo la partición del día, una sesión vieja que sobrevive no contamina "presente ahora".

### Política TTL (decisión D3)

- **QR viejo** — TTL = `expiresAt` + gracia (ej: +2h). Solo limpieza de storage; la vigencia se valida en la Lambda al escanear (`expiresAt > now`), nunca por TTL.
- **SESSION#OPEN** — TTL = `check-in + 26h` (duración, no hora fija: cubre un tenant futuro con turnos nocturnos). El job de cierre borra determinista en operación normal; TTL solo actúa si el job falla.
- **Eventos y Audit** — SIN TTL. Inmutables, son la fuente de verdad para horas y auditoría.

## 5. Decisiones

Todas resueltas ✅ — el motor de asistencia queda definido.

- **D1** — **"Presentes ahora"**: ítem de sesión abierta mutable (`SESSION#OPEN`) + GSI-B por location. *Impacto: estado transitorio por participante.*
- **D2** — Rotación de QR por **EventBridge schedule** (default 8h, configurable por tenant) + rotación manual desde admin. El scan dispara `check-in` (síncrono); el tiempo dispara `rotate-qr`. *Impacto: Q2 resuelto con SK `QR#rotatedAt`.*
- **D3** — TTL por **duración desde check-in** (`check-in + 26h`) — robusto para un tenant futuro con turnos nocturnos/largos; hora fija (ej: 22:00) fallaría si alguien entra tarde. El cierre real lo hace el job de D4 (determinista); TTL solo limpia si el job falla. *Impacto: costo y limpieza automática.*
- **D4** — Híbrido — **"llegó" desde el evento** (SNS en el check-in, inmediato); **"no registró asistencia" / tarde desde el job de cierre** (EventBridge al inicio de clase/turno +15 min de gracia). El mismo job cierra sesiones (D3), escribe check-out forzado y computa tardanzas (R3). *Impacto: no hay aggregator adicional.*
- **D5** — GSI-B **particionado por día** (`LOCATION#id#YYYY-MM-DD`) — todas las queries son diarias, no agrega costo. **Sin SQS**: el check-in es síncrono (confirmación inmediata en la puerta); el write burst lo absorbe la partición por día (1000 WCU/partición). *Impacto: elimina hot partition del reporte del día.*  
