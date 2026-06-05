# Sistema de Turnos

Sistema single-tenant de gestión de turnos y citas, con módulo clínico y un
widget de reservas embebible para sitios externos. Está construido sobre una
arquitectura de microservicios Node.js/Express con Sequelize/MySQL y un
backoffice en Next.js. Cada instalación atiende a un único negocio.

## Alcance

El sistema cubre la operación completa de una agenda de turnos:

- Turnos y citas, disponibilidad por profesional y por servicio, horarios
  semanales y excepciones.
- Profesionales, servicios y la relación entre ambos.
- Clientes/contactos, con módulo clínico opcional (historia, notas y adjuntos).
- Clases grupales con cupo, paquetes de sesiones y lista de espera.
- Formularios de admisión por servicio.
- Cobros y señas con MercadoPago (incluye webhook).
- Bot de WhatsApp para reservas y sincronización con Google Calendar.
- Widget público de reservas, autenticado por `api_key`, para embeber en sitios
  externos.

Es single-tenant: una sola instalación atiende a un único negocio, sin
multi-tenancy ni separación de datos por organización. Las integraciones
externas (Google Calendar, WhatsApp, OpenAI, MercadoPago, SMTP) vienen
desactivadas y se habilitan cargando sus credenciales en el `.env`.

## Arquitectura

```
   navegador / sitios externos
      |
      | HTTP  Host(turnos.localhost)
      v
   Traefik (reverse proxy)
      |
      v
   backoffice (Next.js)  +  widget (API publica)
      |
      | HTTP interno (red net-shared)
      v
   +--------------------------------------------------------------+
   |  microservicios                  servicios core              |
   |  agenda       clinica      pagos  auth (JWT)                 |
   |  integraciones  usuarios  widget  mailer (SMTP)              |
   |                                   storage (MinIO/S3)         |
   +--------------------------------------------------------------+
      |
      v
   MySQL  +  MinIO (adjuntos)
```

El backoffice y el widget se exponen a través de Traefik; el resto de los
servicios son internos y se comunican sobre la red Docker externa `net-shared`.
El código común de los microservicios (`config`, `db`, `middlewares`, `models`,
`requests`, `utils`, `integrations`) vive en `microservicios-turnos/shared/` y
se monta por volumen en cada microservicio, de modo que una sola copia se
comparte entre todos.

## Stack

- Node.js + Express (microservicios y servicios core)
- Sequelize + MySQL
- Next.js (backoffice)
- MinIO / S3 (storage de adjuntos)
- Traefik (reverse proxy)
- Docker + Docker Compose

## Requisitos

- Docker
- Docker Compose (plugin `docker compose`)
- `make`

## Cómo levantar

```bash
# 1. Copiar y completar las variables de entorno
cp .env.example .env

# 2. Levantar red, infraestructura, microservicios y servicios core
make up

# 3. Ejecutar las migraciones (corren dentro del contenedor)
make migrate

# 4. Cargar datos de ejemplo
make seed
```

Si `turnos.localhost` no resuelve en tu sistema, agregá esta línea a
`/etc/hosts`:

```
127.0.0.1   turnos.localhost
```

Accesos:

- Backoffice: <http://turnos.localhost>
- Consola de MinIO: <http://localhost:9001>
- Dashboard de Traefik: <http://localhost:8080>

Credenciales del administrador demo:

- Usuario: `admin@turnos.local`
- Contraseña: `Admin1234!`

## Servicios

| Contenedor                  | Rol                                                  |
|-----------------------------|------------------------------------------------------|
| `turnos_traefik`            | Reverse proxy / enrutamiento por host y path         |
| `turnos_mysql`              | Base de datos MySQL (bases `turnos` y `turnos_auth`) |
| `turnos_minio`              | Almacenamiento de archivos S3 (adjuntos clínicos)    |
| `turnos_backoffice`         | Panel de gestión (Next.js)                           |
| `turnos_auth`               | Autenticación JWT                                    |
| `turnos_mailer`             | Envío de emails (SMTP)                               |
| `turnos_storage`            | Subida, descarga y borrado de archivos en MinIO/S3   |
| `turnos_ms_agenda`          | Turnos, disponibilidad, profesionales, servicios, horarios, clientes, clases grupales, paquetes, lista de espera, bot de WhatsApp y sync Google Calendar |
| `turnos_ms_clinica`         | Fichas clínicas (historia, notas y adjuntos)         |
| `turnos_ms_pagos`           | Cobros con MercadoPago (incluye webhook)             |
| `turnos_ms_integraciones`   | Google Calendar, WhatsApp y OpenAI                   |
| `turnos_ms_usuarios`        | Administradores del sistema                          |
| `turnos_ms_widget`          | API pública de reservas (autenticada por `api_key`)  |

## Integraciones

Todas las integraciones son código real y requieren credenciales propias. Vienen
desactivadas por defecto y se habilitan cargando las variables correspondientes
en el `.env`.

| Integración      | Estado                         | Cómo activar                                                                                  |
|------------------|--------------------------------|----------------------------------------------------------------------------------------------|
| Google Calendar  | Desactivada (sin credenciales) | Crear una app OAuth en Google y completar `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` y `GOOGLE_OAUTH_REDIRECT_URI`. |
| WhatsApp         | Desactivada (sin credenciales) | Cargar `WHATSAPP_TOKEN` y `WHATSAPP_PHONE_ID` de la WhatsApp Cloud API (Meta).               |
| OpenAI           | Desactivada (con fallback)     | Cargar `OPENAI_API_KEY` (y opcionalmente `OPENAI_MODEL`). Sin key, el bot usa una lógica de intención por defecto. |
| MercadoPago      | Desactivada (sin credenciales) | Cargar `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY` y `MP_WEBHOOK_SECRET`.                              |

## Variables de entorno

Todas las variables están documentadas y comentadas por sección en
[`.env.example`](./.env.example). Copialo a `.env` y ajustá los valores antes de
levantar el sistema. Nunca commitees el `.env` real. Los grupos principales son:

- Entorno e infraestructura (Traefik, puertos host).
- Base de datos de los microservicios y del servicio de auth.
- Autenticación inter-servicio (Basic Auth + firma JWT).
- Servicios core: auth, mailer (SMTP) y storage/MinIO.
- URLs internas de los microservicios que consume el backoffice.
- Web / CORS.
- Integraciones opcionales: Google Calendar, MercadoPago, OpenAI y WhatsApp.

## Diccionario de datos

El detalle de las tablas, columnas y relaciones está en
[`docs/DICCIONARIO-DE-DATOS.md`](./docs/DICCIONARIO-DE-DATOS.md).

## Comandos (Makefile)

```bash
make up        # crea la red y levanta infra, microservicios y servicios core
make down      # baja los tres compose
make logs      # logs en vivo de los tres compose
make ps        # estado de los contenedores
make migrate   # corre las migraciones dentro del contenedor
make seed      # carga datos de ejemplo
```

## Licencia

[MIT](./LICENSE)
