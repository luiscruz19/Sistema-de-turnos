# Diccionario de datos

Modelos Sequelize del Sistema de Turnos, definidos en
`microservicios-turnos/shared/models/` y compartidos por todos los
microservicios. Todas las tablas tienen `id` (INTEGER, PK, autoincremental) y,
salvo que se indique lo contrario, las columnas de timestamps de Sequelize
(`createdAt`, `updatedAt`). Las tablas marcadas como *soft delete* agregan
además `deletedAt` (paranoid).

Los modelos están agrupados por dominio:

- [Agenda](#agenda)
- [Clientes y clínica](#clientes-y-clinica)
- [Pagos](#pagos)
- [Integraciones](#integraciones)
- [Sistema](#sistema)

---

## Agenda

### professionals

Profesionales que atienden turnos.

| Columna | Tipo | Null | Default | Descripción |
|---------|------|------|---------|-------------|
| id | INTEGER | No | auto | Identificador |
| name | STRING | No | — | Nombre del profesional |
| email | STRING | Sí | — | Email de contacto |
| phone | STRING | Sí | — | Teléfono de contacto |
| specialty | STRING | Sí | — | Especialidad |
| avatar_url | STRING | Sí | — | URL del avatar |
| color | STRING(20) | Sí | `#6366f1` | Color para el calendario en la UI |
| active | BOOLEAN | No | true | Si está activo |
| sort_order | INTEGER | No | 0 | Orden de visualización |

### services

Servicios o prestaciones que se pueden reservar.

| Columna | Tipo | Null | Default | Descripción |
|---------|------|------|---------|-------------|
| id | INTEGER | No | auto | Identificador |
| name | STRING | No | — | Nombre del servicio |
| description | TEXT | Sí | — | Descripción |
| duration_minutes | INTEGER | No | 30 | Duración del turno en minutos |
| buffer_time_minutes | INTEGER | No | 0 | Tiempo de preparación entre turnos (minutos) |
| price | DECIMAL(10,2) | Sí | 0 | Precio |
| deposit_amount | DECIMAL(10,2) | Sí | 0 | Monto de seña |
| category | STRING | Sí | — | Categoría |
| requires_professional | BOOLEAN | No | true | Si requiere asignar profesional |
| max_concurrent | INTEGER | No | 1 | Turnos simultáneos (canchas/salas) |
| active | BOOLEAN | No | true | Si está activo |
| sort_order | INTEGER | No | 0 | Orden de visualización |

### professional_services

Relación N:M entre profesionales y servicios que prestan.

| Columna | Tipo | Null | Default | Descripción |
|---------|------|------|---------|-------------|
| id | INTEGER | No | auto | Identificador |
| professional_id | INTEGER | No | — | Profesional |
| service_id | INTEGER | No | — | Servicio |

Índice único en `(professional_id, service_id)`.

### schedules

Horarios semanales de atención (del negocio o por profesional).

| Columna | Tipo | Null | Default | Descripción |
|---------|------|------|---------|-------------|
| id | INTEGER | No | auto | Identificador |
| professional_id | INTEGER | Sí | — | Profesional; null = horario del negocio |
| day_of_week | INTEGER | No | — | Día de la semana (0=Domingo … 6=Sábado) |
| start_time | TIME | No | — | Hora de inicio |
| end_time | TIME | No | — | Hora de fin |
| active | BOOLEAN | No | true | Si está activo |

### schedule_exceptions

Excepciones puntuales a los horarios (bloqueos o jornadas especiales).

| Columna | Tipo | Null | Default | Descripción |
|---------|------|------|---------|-------------|
| id | INTEGER | No | auto | Identificador |
| professional_id | INTEGER | Sí | — | Profesional; null = aplica al negocio |
| date | DATEONLY | No | — | Fecha de la excepción |
| start_time | TIME | Sí | — | Hora de inicio; null cuando todo el día está bloqueado |
| end_time | TIME | Sí | — | Hora de fin |
| is_blocked | BOOLEAN | No | true | true = no disponible; false = horario especial |
| reason | STRING | Sí | — | Motivo |

### appointments

Turnos/citas reservados.

| Columna | Tipo | Null | Default | Descripción |
|---------|------|------|---------|-------------|
| id | INTEGER | No | auto | Identificador |
| professional_id | INTEGER | Sí | — | Profesional asignado |
| service_id | INTEGER | No | — | Servicio reservado |
| client_contact_id | INTEGER | Sí | — | Cliente asociado |
| client_name | STRING | No | — | Nombre del cliente (requerido) |
| client_email | STRING | Sí | — | Email del cliente |
| client_phone | STRING | Sí | — | Teléfono del cliente |
| date | DATEONLY | No | — | Fecha del turno |
| start_time | TIME | No | — | Hora de inicio |
| end_time | TIME | No | — | Hora de fin |
| status | ENUM(pending, confirmed, cancelled, completed, no_show) | No | pending | Estado del turno |
| source | ENUM(web, whatsapp, manual) | No | manual | Canal de origen |
| deposit_status | ENUM(none, pending, paid) | No | none | Estado de la seña |
| deposit_amount | DECIMAL(10,2) | Sí | 0 | Monto de seña |
| notes | TEXT | Sí | — | Notas |
| reminder_sent | BOOLEAN | No | false | Recordatorio enviado |
| reminder_24h_sent | BOOLEAN | No | false | Recordatorio de 24h enviado |
| cancelled_at | DATE | Sí | — | Fecha de cancelación |
| cancel_reason | STRING | Sí | — | Motivo de cancelación |
| external_calendar_id | STRING | Sí | — | ID de evento en Google Calendar |
| current_payment_intent_id | INTEGER | Sí | — | Último PaymentIntent asociado |
| payment_required | BOOLEAN | No | false | Si requiere pago |

### appointment_reminders

Registro de recordatorios enviados por turno. Solo lleva `createdAt`.

| Columna | Tipo | Null | Default | Descripción |
|---------|------|------|---------|-------------|
| id | INTEGER | No | auto | Identificador |
| appointment_id | INTEGER | No | — | Turno |
| type | ENUM(24h, 2h, custom) | No | — | Tipo de recordatorio |
| channel | ENUM(whatsapp, email, sms) | No | — | Canal de envío |
| sent_at | DATE | Sí | — | Fecha de envío |
| status | ENUM(sent, failed) | No | sent | Resultado del envío |

### group_classes

Clases grupales con cupo. *Soft delete*.

| Columna | Tipo | Null | Default | Descripción |
|---------|------|------|---------|-------------|
| id | INTEGER | No | auto | Identificador |
| service_id | INTEGER | No | — | Servicio asociado |
| professional_id | INTEGER | Sí | — | Profesional a cargo |
| titulo | STRING(300) | No | — | Título de la clase |
| descripcion | TEXT | Sí | — | Descripción |
| fecha_hora | DATE | No | — | Fecha y hora de la clase |
| duracion_minutos | INTEGER | No | — | Duración en minutos |
| cupo_maximo | INTEGER | No | — | Cupo máximo |
| precio | DECIMAL(10,2) | No | 0 | Precio |
| estado | ENUM(publicada, cancelada, completada) | No | publicada | Estado de la clase |

### group_class_enrollments

Inscripciones a clases grupales.

| Columna | Tipo | Null | Default | Descripción |
|---------|------|------|---------|-------------|
| id | INTEGER | No | auto | Identificador |
| group_class_id | INTEGER | No | — | Clase grupal |
| client_contact_id | INTEGER | No | — | Cliente inscripto |
| estado | ENUM(inscripto, cancelado, asistio, no_asistio) | No | inscripto | Estado de la inscripción |
| payment_intent_id | INTEGER | Sí | — | Pago asociado |

Índice único en `(group_class_id, client_contact_id)`.

### session_packages

Paquetes de sesiones a la venta (bono de N sesiones). *Soft delete*.

| Columna | Tipo | Null | Default | Descripción |
|---------|------|------|---------|-------------|
| id | INTEGER | No | auto | Identificador |
| nombre | STRING(300) | No | — | Nombre del paquete |
| descripcion | TEXT | Sí | — | Descripción |
| service_id | INTEGER | No | — | Servicio al que aplica |
| sesiones_total | INTEGER | No | — | Cantidad de sesiones incluidas |
| precio | DECIMAL(10,2) | No | — | Precio del paquete |
| validez_dias | INTEGER | Sí | — | Días de validez desde la compra; null = sin vencimiento |
| activo | BOOLEAN | No | true | Si está activo |

### waitlist_entries

Lista de espera de clientes para un servicio. *Soft delete*.

| Columna | Tipo | Null | Default | Descripción |
|---------|------|------|---------|-------------|
| id | INTEGER | No | auto | Identificador |
| client_contact_id | INTEGER | No | — | Cliente |
| service_id | INTEGER | No | — | Servicio deseado |
| professional_id | INTEGER | Sí | — | Profesional preferido; null = cualquiera |
| fecha_preferida | DATEONLY | Sí | — | Fecha preferida |
| notificado | BOOLEAN | No | false | Si fue notificado |
| notificado_at | DATE | Sí | — | Fecha de notificación |
| estado | ENUM(esperando, notificado, reservado, cancelado) | No | esperando | Estado en la lista |

---

## Clientes y clinica

### client_contacts

Contactos/clientes del negocio.

| Columna | Tipo | Null | Default | Descripción |
|---------|------|------|---------|-------------|
| id | INTEGER | No | auto | Identificador |
| name | STRING | No | — | Nombre (requerido) |
| email | STRING | Sí | — | Email |
| phone | STRING | Sí | — | Teléfono |
| notes | TEXT | Sí | — | Notas generales |
| last_appointment_at | DATE | Sí | — | Fecha del último turno |
| appointment_count | INTEGER | No | 0 | Cantidad de turnos |
| no_show_count | INTEGER | No | 0 | Cantidad de inasistencias |

### client_records

Historia clínica resumida del cliente (vertical salud). Un registro por cliente.

| Columna | Tipo | Null | Default | Descripción |
|---------|------|------|---------|-------------|
| id | INTEGER | No | auto | Identificador |
| client_contact_id | INTEGER | No | — | Cliente (único) |
| summary | TEXT | Sí | — | Resumen |
| allergies | TEXT | Sí | — | Alergias |
| medications | TEXT | Sí | — | Medicación |
| conditions | TEXT | Sí | — | Condiciones/antecedentes |
| blood_type | STRING(10) | Sí | — | Grupo sanguíneo |
| emergency_contact | STRING(200) | Sí | — | Contacto de emergencia |

### client_notes

Notas clínicas sobre un cliente, opcionalmente ligadas a un turno.

| Columna | Tipo | Null | Default | Descripción |
|---------|------|------|---------|-------------|
| id | INTEGER | No | auto | Identificador |
| client_contact_id | INTEGER | No | — | Cliente |
| professional_id | INTEGER | Sí | — | Profesional |
| appointment_id | INTEGER | Sí | — | Turno asociado |
| author_user_id | INTEGER | Sí | — | Usuario autor |
| content | TEXT | No | — | Contenido de la nota |
| is_private | BOOLEAN | No | false | Si solo la ven el autor y los admins |

### client_attachments

Archivos adjuntos del cliente (almacenados en storage/MinIO).

| Columna | Tipo | Null | Default | Descripción |
|---------|------|------|---------|-------------|
| id | INTEGER | No | auto | Identificador |
| client_contact_id | INTEGER | No | — | Cliente |
| file_url | STRING(500) | No | — | URL del archivo |
| file_name | STRING(255) | No | — | Nombre del archivo |
| mime_type | STRING(120) | Sí | — | Tipo MIME |
| size_bytes | BIGINT | Sí | — | Tamaño en bytes |
| uploaded_by | INTEGER | Sí | — | user_id de quien subió el archivo |
| description | STRING(500) | Sí | — | Descripción |

### client_packages

Paquetes de sesiones comprados por un cliente. *Soft delete*.

| Columna | Tipo | Null | Default | Descripción |
|---------|------|------|---------|-------------|
| id | INTEGER | No | auto | Identificador |
| client_contact_id | INTEGER | No | — | Cliente |
| session_package_id | INTEGER | No | — | Paquete comprado |
| sesiones_usadas | INTEGER | No | 0 | Sesiones consumidas |
| sesiones_total | INTEGER | No | — | Sesiones totales |
| precio_pagado | DECIMAL(10,2) | No | — | Precio pagado |
| fecha_compra | DATEONLY | No | — | Fecha de compra |
| fecha_vencimiento | DATEONLY | Sí | — | Fecha de vencimiento |
| estado | ENUM(activo, completado, vencido, cancelado) | No | activo | Estado del paquete |

### intake_forms

Formularios de admisión, opcionalmente por servicio. *Soft delete*.

| Columna | Tipo | Null | Default | Descripción |
|---------|------|------|---------|-------------|
| id | INTEGER | No | auto | Identificador |
| service_id | INTEGER | Sí | — | Servicio; null = aplica a todos |
| nombre | STRING(300) | No | — | Nombre del formulario |
| descripcion | TEXT | Sí | — | Descripción |
| activo | BOOLEAN | No | true | Si está activo |

### intake_fields

Campos de un formulario de admisión.

| Columna | Tipo | Null | Default | Descripción |
|---------|------|------|---------|-------------|
| id | INTEGER | No | auto | Identificador |
| intake_form_id | INTEGER | No | — | Formulario |
| label | STRING(300) | No | — | Etiqueta del campo |
| tipo | ENUM(text, textarea, select, radio, checkbox, date) | No | text | Tipo de campo |
| opciones | JSON | Sí | — | Opciones para select/radio/checkbox |
| requerido | BOOLEAN | No | false | Si es obligatorio |
| orden | INTEGER | No | 0 | Orden del campo |

### intake_responses

Respuestas a un formulario de admisión asociadas a un turno.

| Columna | Tipo | Null | Default | Descripción |
|---------|------|------|---------|-------------|
| id | INTEGER | No | auto | Identificador |
| appointment_id | INTEGER | No | — | Turno |
| intake_form_id | INTEGER | No | — | Formulario |
| client_contact_id | INTEGER | Sí | — | Cliente |
| respuestas | JSON | No | — | Objeto key:value con field_id como clave |

---

## Pagos

### payment_intents

Intenciones de cobro (preferencias de pago de MercadoPago).

| Columna | Tipo | Null | Default | Descripción |
|---------|------|------|---------|-------------|
| id | INTEGER | No | auto | Identificador |
| appointment_id | INTEGER | Sí | — | Turno asociado |
| client_contact_id | INTEGER | Sí | — | Cliente |
| provider | STRING(30) | No | mercadopago | Proveedor de pago |
| mode | ENUM(live, simulated) | No | live | Modo real o simulado |
| amount | DECIMAL(12,2) | No | 0 | Monto |
| currency | STRING(10) | No | ARS | Moneda |
| status | ENUM(pending, paid, expired, cancelled, refunded) | No | pending | Estado del cobro |
| description | STRING(255) | Sí | — | Descripción |
| mp_preference_id | STRING(120) | Sí | — | ID de preferencia de MercadoPago |
| mp_init_point | STRING(500) | Sí | — | URL de checkout de MercadoPago |
| mp_external_reference | STRING(120) | Sí | — | Referencia externa |
| expires_at | DATE | Sí | — | Vencimiento |
| paid_at | DATE | Sí | — | Fecha de pago |

### payment_transactions

Transacciones/eventos recibidos del proveedor para una intención de pago.

| Columna | Tipo | Null | Default | Descripción |
|---------|------|------|---------|-------------|
| id | INTEGER | No | auto | Identificador |
| payment_intent_id | INTEGER | No | — | Intención de pago |
| provider | STRING(30) | No | mercadopago | Proveedor |
| mp_payment_id | STRING(120) | Sí | — | ID de pago de MercadoPago |
| status | STRING(30) | No | pending | Estado (approved, pending, rejected, refunded, in_process, cancelled) |
| status_detail | STRING(100) | Sí | — | Detalle del estado |
| amount | DECIMAL(12,2) | No | 0 | Monto |
| raw_payload | JSON | Sí | — | Payload crudo del proveedor |
| event_type | STRING(50) | Sí | — | Tipo de evento (payment, refund, chargeback, test) |

---

## Integraciones

### integrations

Credenciales y estado de integraciones externas. El JSON de credenciales se
guarda cifrado con AES-256-GCM (ver `shared/utils/crypto.js`).

| Columna | Tipo | Null | Default | Descripción |
|---------|------|------|---------|-------------|
| id | INTEGER | No | auto | Identificador |
| provider | STRING(50) | No | — | mercadopago, openai, whatsapp, google_calendar, … |
| scope | STRING(100) | Sí | — | Sub-clave opcional (p.ej. professional_id) |
| credentials_encrypted | TEXT(long) | Sí | — | JSON de credenciales cifrado |
| config | JSON | Sí | — | Metadata no sensible (modelos, flags, ids públicos) |
| enabled | BOOLEAN | No | true | Si está habilitada |
| last_tested_at | DATE | Sí | — | Último test de conexión |
| last_test_status | STRING(20) | Sí | — | Resultado del test (ok, error) |
| last_test_error | STRING(500) | Sí | — | Error del último test |

Índice único en `(provider, scope)`.

### professional_calendar_sync

Estado del sync bidireccional de Google Calendar por profesional.

| Columna | Tipo | Null | Default | Descripción |
|---------|------|------|---------|-------------|
| id | INTEGER | No | auto | Identificador |
| professional_id | INTEGER | No | — | Profesional (único) |
| provider | STRING(30) | No | google_calendar | Proveedor de calendario |
| google_calendar_id | STRING(255) | Sí | primary | ID del calendario |
| integration_scope | STRING(100) | Sí | — | Scope de la integración asociada |
| sync_enabled | BOOLEAN | No | false | Si el sync está activo |
| last_synced_at | DATE | Sí | — | Última sincronización |
| last_sync_status | STRING(20) | Sí | — | Estado del último sync |
| last_sync_error | STRING(500) | Sí | — | Error del último sync |
| sync_token | STRING(500) | Sí | — | Token para sync incremental (pull) |

### whatsapp_sessions

Estado de las conversaciones del bot de WhatsApp por número.

| Columna | Tipo | Null | Default | Descripción |
|---------|------|------|---------|-------------|
| id | INTEGER | No | auto | Identificador |
| phone_number | STRING | No | — | Número de teléfono (único) |
| conversation_state | ENUM(idle, booking, confirming, cancelling) | No | idle | Estado de la conversación |
| current_data | JSON | Sí | — | Datos parciales de la reserva en curso |
| last_message_at | DATE | Sí | — | Fecha del último mensaje |

---

## Sistema

### administrators

Administradores del sistema (vinculados a usuarios del servicio de auth).

| Columna | Tipo | Null | Default | Descripción |
|---------|------|------|---------|-------------|
| id | INTEGER | No | auto | Identificador |
| client_name | STRING | Sí | — | Nombre del cliente/negocio |
| user_id | INTEGER | No | — | Usuario en el servicio de auth |
| name | STRING | No | — | Nombre del administrador |
| phone | STRING | No | — | Teléfono |
| created_by | INTEGER | No | — | Usuario que lo creó |

### business_configs

Configuración general del negocio (single-tenant: un registro).

| Columna | Tipo | Null | Default | Descripción |
|---------|------|------|---------|-------------|
| id | INTEGER | No | auto | Identificador |
| name | STRING | No | — | Nombre del negocio (requerido) |
| address | STRING | Sí | — | Dirección |
| phone | STRING | Sí | — | Teléfono |
| timezone | STRING(50) | No | America/Argentina/Buenos_Aires | Zona horaria |
| currency | STRING(10) | No | ARS | Moneda |
| booking_advance_days | INTEGER | No | 30 | Días de antelación para reservar |
| cancellation_policy_hours | INTEGER | No | 24 | Horas mínimas para cancelar |
| slot_duration_default | INTEGER | No | 30 | Duración por defecto del slot (minutos) |
| auto_confirm | BOOLEAN | No | true | Confirmar turnos automáticamente |
| deposit_required | BOOLEAN | No | false | Si se exige seña |
| deposit_percentage | DECIMAL(5,2) | Sí | 0 | Porcentaje de seña |
| api_key | STRING(64) | No | — | API key del widget (único) |
| require_payment | BOOLEAN | No | false | Si al confirmar se crea un PaymentIntent |
| payment_advance_pct | DECIMAL(5,2) | Sí | — | Porcentaje de seña sobre el precio del servicio |
| enable_health_records | BOOLEAN | No | false | Habilita historia clínica (vertical salud) |

### analytics_daily

Métricas diarias agregadas del negocio.

| Columna | Tipo | Null | Default | Descripción |
|---------|------|------|---------|-------------|
| id | INTEGER | No | auto | Identificador |
| date | DATEONLY | No | — | Fecha (única) |
| total_appointments | INTEGER | No | 0 | Total de turnos |
| confirmed | INTEGER | No | 0 | Turnos confirmados |
| cancelled | INTEGER | No | 0 | Turnos cancelados |
| no_shows | INTEGER | No | 0 | Inasistencias |
| revenue | DECIMAL(10,2) | No | 0 | Ingresos |
| new_clients | INTEGER | No | 0 | Clientes nuevos |

---

## Relaciones

Asociaciones definidas en `microservicios-turnos/shared/models/index.js`.

### Agenda

- **Professional** N:M **Service** a través de **ProfessionalService**
  (`professional_id`, `service_id`).
- **Professional** 1:N **Appointment** (`professional_id`).
- **Service** 1:N **Appointment** (`service_id`).
- **ClientContact** 1:N **Appointment** (`client_contact_id`).
- **Appointment** 1:N **AppointmentReminder** (`appointment_id`).
- **Professional** 1:N **Schedule** (`professional_id`).
- **Professional** 1:N **ScheduleException** (`professional_id`).
- **Service** 1:N **GroupClass** (`service_id`).
- **Professional** 1:N **GroupClass** (`professional_id`).
- **GroupClass** 1:N **GroupClassEnrollment** (`group_class_id`).
- **ClientContact** 1:N **GroupClassEnrollment** (`client_contact_id`).
- **Service** 1:N **SessionPackage** (`service_id`).
- **Service** 1:N **WaitlistEntry** (`service_id`).
- **Professional** 1:N **WaitlistEntry** (`professional_id`).
- **ClientContact** 1:N **WaitlistEntry** (`client_contact_id`).

### Clientes y clínica

- **ClientContact** 1:1 **ClientRecord** (`client_contact_id`).
- **ClientContact** 1:N **ClientNote** (`client_contact_id`).
- **ClientNote** N:1 **Professional** (`professional_id`).
- **ClientNote** N:1 **Appointment** (`appointment_id`).
- **ClientContact** 1:N **ClientAttachment** (`client_contact_id`).
- **ClientContact** 1:N **ClientPackage** (`client_contact_id`).
- **SessionPackage** 1:N **ClientPackage** (`session_package_id`).
- **Service** 1:N **IntakeForm** (`service_id`).
- **IntakeForm** 1:N **IntakeField** (`intake_form_id`).
- **IntakeForm** 1:N **IntakeResponse** (`intake_form_id`).
- **Appointment** 1:N **IntakeResponse** (`appointment_id`).
- **ClientContact** 1:N **IntakeResponse** (`client_contact_id`).

### Pagos

- **Appointment** 1:N **PaymentIntent** (`appointment_id`).
- **ClientContact** 1:N **PaymentIntent** (`client_contact_id`).
- **PaymentIntent** 1:N **PaymentTransaction** (`payment_intent_id`).

### Integraciones

- **Professional** 1:1 **ProfessionalCalendarSync** (`professional_id`).

Los modelos **Integration**, **WhatsappSession**, **Admin**, **BusinessConfig**
y **AnalyticsDaily** no declaran asociaciones; se referencian por sus claves
(p.ej. `Integration.provider`/`scope`, `Admin.user_id`).
