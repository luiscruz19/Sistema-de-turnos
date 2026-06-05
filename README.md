# Sistema de Turnos

Sistema **single-tenant** de gestión de turnos/citas, con módulo clínico y un
**widget de reservas embebible** para sitios externos. Está construido sobre una
arquitectura de microservicios en Node.js/Express con un backoffice en Next.js.

## Alcance

### Módulos / microservicios

- **agenda**: turnos/citas, disponibilidad, profesionales, servicios, horarios, clientes, clases grupales, formularios de admisión, paquetes de sesiones, lista de espera, bot de WhatsApp y sincronización con Google Calendar.
- **clinica**: fichas clínicas (historia, notas y adjuntos a través de storage).
- **pagos**: cobros con MercadoPago (incluye webhook público).
- **integraciones**: Google Calendar, WhatsApp y OpenAI (credenciales por `.env` / modelo `Integration`).
- **usuarios**: administradores del sistema (`/system/administrators`).
- **widget**: API pública de reservas embebible (autenticación por `api_key`).
- **backoffice**: panel de gestión (Next.js).
- **auth**: autenticación JWT.
- **mailer**: envío de emails (SMTP).
- **storage**: archivos en MinIO/S3 (subida, descarga y borrado).

### Qué NO es

- **Single-tenant**: una sola instalación atiende a un único negocio/cliente. No hay multi-tenancy ni separación de datos por organización.
- Las **integraciones** (Google Calendar, MercadoPago, OpenAI, WhatsApp, SMTP) son opcionales y se habilitan únicamente cargando sus credenciales en el `.env`.

## Arquitectura

```
                 ┌──────────────┐     ┌──────────────┐
   navegador ───▶│  backoffice  │     │    widget    │◀─── sitios externos
                 │  (Next.js)   │     │ (API pública)│
                 └──────┬───────┘     └──────┬───────┘
                        │                    │
                        ▼                    ▼
                 ┌────────────────────────────────┐
                 │      Traefik (reverse proxy)    │   turnos.localhost
                 └───────────────┬─────────────────┘
                                 │
        ┌────────────────────────┼───────────────────────────┐
        ▼                        ▼                            ▼
┌───────────────┐   ┌──────────────────────────┐   ┌──────────────────┐
│ servicios core│   │      microservicios       │   │   storage (/storage)
│  auth (JWT)   │   │  agenda · clinica · pagos │   │   MinIO / S3      │
│  mailer (SMTP)│   │  integraciones · usuarios │   └─────────┬────────┘
└───────┬───────┘   │  widget                   │             │
        │           └───────────┬──────────────┘             ▼
        │                       │                       ┌──────────┐
        └───────────┬───────────┘                       │  MinIO   │
                    ▼                                    └──────────┘
              ┌──────────┐
              │  MySQL    │   bases: turnos, turnos_auth
              └──────────┘
```

El código común de los microservicios (`config`, `db`, `middlewares`, `models`,
`requests`, `utils`) vive en `microservicios-turnos/shared/` y se **monta por
volumen** en cada microservicio, de modo que una sola copia se comparte entre todos.

## Cómo levantar

### Requisitos

- Docker
- Docker Compose

### Pasos

```bash
# 1. Copiar y completar las variables de entorno
cp .env.example .env

# 2. Levantar red, infraestructura, microservicios y servicios core
make up

# 3. Ejecutar las migraciones de base de datos
make migrate
```

### Acceso

- **Backoffice**: http://turnos.localhost
- **Consola de MinIO**: http://localhost:9001
- **Dashboard de Traefik**: http://localhost:8080

> Si `turnos.localhost` no resuelve en tu sistema, agregá una entrada en
> `/etc/hosts`:
>
> ```
> 127.0.0.1   turnos.localhost
> ```

## Servicios

| Contenedor                | Rol                                                            |
|---------------------------|---------------------------------------------------------------|
| `turnos_traefik`          | Reverse proxy / enrutamiento por host y path                  |
| `turnos_mysql`            | Base de datos MySQL (bases `turnos` y `turnos_auth`)          |
| `turnos_minio`            | Almacenamiento de archivos S3 (adjuntos clínicos)             |
| `turnos_backoffice`       | Panel de gestión (Next.js)                                     |
| `turnos_auth`             | Autenticación JWT (interno)                                    |
| `turnos_mailer`           | Envío de emails SMTP (interno)                                 |
| `turnos_storage`          | API de archivos sobre MinIO (`/storage`)                      |
| `turnos_ms_agenda`        | Turnos, disponibilidad, profesionales, clientes, WhatsApp     |
| `turnos_ms_clinica`       | Fichas clínicas y adjuntos                                     |
| `turnos_ms_pagos`         | Cobros con MercadoPago                                         |
| `turnos_ms_integraciones` | Google Calendar, WhatsApp, OpenAI                             |
| `turnos_ms_usuarios`      | Administradores del sistema                                    |
| `turnos_ms_widget`        | API pública de reservas embebible                            |

## Variables de entorno

Todas las variables están documentadas y comentadas por sección en
[`.env.example`](./.env.example). Copialo a `.env` y completá los valores
(credenciales de base de datos, autenticación e integraciones opcionales).

## Comandos disponibles (Makefile)

| Comando        | Descripción                                          |
|----------------|------------------------------------------------------|
| `make up`      | Levanta red, infraestructura, microservicios y core  |
| `make down`    | Baja los tres compose                                |
| `make logs`    | Muestra logs en vivo                                 |
| `make ps`      | Lista el estado de los contenedores                  |
| `make migrate` | Ejecuta las migraciones de base de datos             |
| `make seed`    | Carga datos de ejemplo (placeholder)                 |

## Licencia

[MIT](./LICENSE)
