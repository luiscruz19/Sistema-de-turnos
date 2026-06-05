# storage

Canonical storage microservice. Handles file upload, download, resize on-the-fly, and optional QR code generation, backed by a MinIO object store.

## Stack

| Package | Role |
|---|---|
| Node.js (ESM) | Runtime |
| Express 4 | HTTP server |
| MinIO SDK 8 | Object storage client |
| multer | Multipart file parsing |
| sharp | Image optimisation / resize / thumbnail |
| file-type | Magic-byte MIME detection |
| DOMPurify + jsdom | SVG sanitisation |
| qrcode | QR code rendering (optional) |
| helmet + cors | Security headers |
| express-rate-limit | Upload rate limiting |

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `MINIO_APP_PORT` | `80` | Port the service listens on |
| `NODE_ENV` | `development` | `development` or `production` |
| `MINIO_INITIAL_ROUTE` | `/storage` | URL prefix for all storage routes |
| `MINIO_ENDPOINT` | `minio` | MinIO host (Docker service name or hostname) |
| `MINIO_ENDPOINT_PORT` | `9000` | MinIO port |
| `MINIO_ACCESS_KEY` | — | MinIO access key |
| `MINIO_SECRET_KEY` | — | MinIO secret key |
| `MINIO_BUCKET_NAME` | — | Bucket to store files in (created automatically if absent) |
| `MINIO_USE_SSL` | `false` | Connect to MinIO over TLS |
| `MINIO_PRIVATE_URL` | — | Internal base URL used to build public file URLs (e.g. `http://minio:9000`) |
| `AUTH_BASIC_USER` | — | Basic Auth username for protected endpoints |
| `AUTH_BASIC_PW` | — | Basic Auth password for protected endpoints |
| `SECRET_KEY` | `token` | Internal JWT / inter-service secret |
| `USUARIOS_API_URL` | — | Base URL for the users microservice |
| `ADMINISTRADORES_API_URL` | — | Fallback if `USUARIOS_API_URL` is not set |
| `WEB_URL` | — | Front-end origin used to derive CORS allowed origins |
| `CORS_ALLOWED_ORIGINS` | — | Comma-separated list of allowed origins (overrides `WEB_URL`) |
| `STORAGE_RATE_LIMIT_WINDOW_MS` | `60000` | Upload rate-limit window in milliseconds |
| `STORAGE_RATE_LIMIT_MAX` | `50` | Maximum upload requests per window |
| `STORAGE_MAX_SIZE_MB` | `500` | Hard file-size ceiling for videos and generic files (MB) |
| `STORAGE_OUTPUT_FORMAT` | `webp` | Output format for processed images (`webp`, `jpeg`, `png`, `avif`) |
| `STORAGE_MAX_WIDTH` | `1920` | Maximum width for resized images (px) |
| `STORAGE_QUALITY` | `85` | Encoding quality for processed images (1–100) |
| `STORAGE_THUMBNAIL_WIDTH` | `300` | Thumbnail width (px) |
| `STORAGE_THUMBNAIL_HEIGHT` | `300` | Thumbnail height (px) |
| `STORAGE_ENABLE_AV_SCAN` | `false` | Enable ClamAV antivirus scan on upload |
| `STORAGE_AV_FAIL_CLOSED` | `true` | Reject upload if clamscan is unavailable or errors |
| `STORAGE_ENABLE_QR` | `false` | Mount the QR code generation endpoint |
| `STORAGE_BLOCKED_MIME_TYPES` | — | Extra MIME types to block (comma-separated) |
| `STORAGE_BLOCKED_EXTENSIONS` | `.php,.exe,.sh,.bat` | Extra extensions to block (comma-separated) |

## Feature flags

| Flag | Effect when `true` |
|---|---|
| `STORAGE_ENABLE_AV_SCAN` | Each uploaded file is scanned with `clamscan` before being stored. If the binary is absent and `STORAGE_AV_FAIL_CLOSED=false`, the scan is skipped silently. |
| `STORAGE_ENABLE_QR` | Mounts `POST /storage/qr/generate`. The route is not registered at all when the flag is `false`. |

## Endpoints

All routes are prefixed with `MINIO_INITIAL_ROUTE` (default `/storage`).

Protected endpoints require `Authorization: Basic <base64(user:password)>`.

| Method | Path | Auth | Body / Query | Response |
|---|---|---|---|---|
| `POST` | `/storage/upload` | Basic Auth | `multipart/form-data` — field `file` | `{ url, fileName, thumbnailAvailable, ... }` |
| `GET` | `/storage/:fileName` | Public | `?thumbnail=true` — serve thumbnail if available | File stream |
| `GET` | `/storage/:fileName` | Public | `?download=true` — force `Content-Disposition: attachment` | File stream |
| `GET` | `/storage/:fileName` | Public | `?w=&h=&q=` — (reserved query params, served from stored object) | File stream |
| `DELETE` | `/storage/:fileName` | Basic Auth | — | `{ status, message }` |
| `POST` | `/storage/qr/generate` | Basic Auth | `{ text, errorCorrectionLevel?, size?, margin? }` | `{ fileName, size }` |
| `GET` | `/health` | Public | — | `{ status, service, uptime }` or `503` if MinIO is unreachable |

### Upload response shape

```json
{
  "status": 1,
  "message": "El archivo fue subido y procesado exitosamente.",
  "fileName": "1718000000000_ab1c2d.webp",
  "baseFileName": "1718000000000_ab1c2d",
  "fileSize": 45320,
  "originalSize": 210000,
  "compressionRatio": "21.6%",
  "category": "images",
  "type": "JPEG",
  "etag": { "etag": "abc123", "versionId": null },
  "uploadDate": "2024-06-10T12:00:00.000Z",
  "thumbnailAvailable": true
}
```

### QR generate body

```json
{
  "text": "https://example.com",
  "errorCorrectionLevel": "H",
  "size": 512,
  "margin": 4
}
```

`errorCorrectionLevel` accepts `L`, `M`, `Q`, `H` (default `H`). `size` is clamped to 64–2048 px.

## Supported file types

Images, videos, audio, PDFs, and archives are accepted. The service performs two-layer type detection (magic bytes via `file-type`, then fallback to declared MIME / extension).

Special image formats with server-side conversion:

| Format | Conversion tool |
|---|---|
| HEIC / HEIF | `heif-convert` (libheif) |
| EMF / WMF | `unoconv` + LibreOffice |
| SVG | `sharp` (rasterise) + DOMPurify sanitisation |

### Built-in blocklist

The following types are always rejected regardless of env configuration:

- **MIME**: `text/html`, `application/javascript`, `text/javascript`, `application/x-sh`, `application/x-bat`, `application/x-msdownload`, `application/x-httpd-php`, and variants.
- **Extensions**: `exe`, `bat`, `cmd`, `sh`, `php`, `phtml`, `js`, `mjs`, `cjs`, `html`, `htm`, `dll`, `msi`.

Additional types can be blocked via `STORAGE_BLOCKED_MIME_TYPES` and `STORAGE_BLOCKED_EXTENSIONS`.

## Thumbnails and resize

When an image is uploaded the service stores two objects:

- `<baseKey>.<format>` — full resolution, resized to at most `STORAGE_MAX_WIDTH` px wide.
- `<baseKey>_thumb.<format>` — cover-cropped thumbnail at `STORAGE_THUMBNAIL_WIDTH` × `STORAGE_THUMBNAIL_HEIGHT` px.

Serving `GET /storage/<fileName>?thumbnail=true` returns the thumbnail automatically, falling back to the original if the thumbnail is missing.

## Docker

### Development (with hot-reload)

```bash
docker build -f Dockerfile.development -t storage:dev .
docker run --env-file .env -p 3010:80 storage:dev
```

The development image installs `libheif-examples`, `imagemagick`, `unoconv`, and LibreOffice for full HEIC/EMF/WMF conversion support.

### Production (multi-stage, non-root)

```bash
docker build -f Dockerfile.production -t storage:prod .
docker run --env-file .env -p 3010:80 storage:prod
```

The production image uses a two-stage build: dependencies are installed in an isolated stage and only the pruned `node_modules` are copied into the slim runtime image. The process runs as a non-root user (`nodeuser`) under `dumb-init`.

> **Note**: both images install `libheif`/`imagemagick`/`unoconv` for HEIC and EMF/WMF conversion. If you do not need those formats, you can remove the corresponding `apt-get` lines to reduce image size.

---

## Debugging & Observability

### LOG_LEVEL

Controlá la verbosidad con la variable de entorno `LOG_LEVEL`:

| Nivel | Cuándo usarlo |
|-------|---------------|
| `debug` | Todo: operaciones MinIO, procesamiento de imágenes (sharp), generación de QR. |
| `info` | Operación normal: uploads, descargas, arranque. **Default en desarrollo.** |
| `warn` | Estados degradados: respuestas 4xx, fallbacks de formato, archivos rechazados. |
| `error` | Fallos: 5xx, MinIO no accesible, error de procesamiento de imagen. **Default en producción.** |

```bash
# Activar debug en producción sin redeployar
LOG_LEVEL=debug docker compose restart storage
```

### Formato de logs

**Desarrollo** — texto legible:
```
[2026-05-11T21:00:00.000Z] [INFO]  POST /storage/upload → 200 { requestId: 'f5e6...', ms: 820 }
[2026-05-11T21:00:01.000Z] [WARN]  POST /storage/upload → 400 { requestId: 'g7h8...', ms: 15 }
```

**Producción** — una línea JSON por evento:
```json
{"ts":"2026-05-11T21:00:00.000Z","level":"INFO","service":"storage","msg":"POST /storage/upload → 200","requestId":"f5e6...","method":"POST","path":"/storage/upload","status":200,"ms":820}
```

Los campos `accessKey`, `secretKey`, `password` y `token` son redactados automáticamente.

### HTTP access log

Cada request (excepto `/health`) genera una línea automáticamente. Nivel: `INFO` para 2xx/3xx, `WARN` para 4xx, `ERROR` para 5xx.

### Filtrar logs en producción

```bash
# Seguir logs en tiempo real
docker compose logs -f storage

# Uploads fallidos
docker compose logs --no-log-prefix storage | jq 'select(.path | contains("upload") and .status >= 400)'

# Uploads lentos (> 2s — puede indicar problema de red con MinIO)
docker compose logs --no-log-prefix storage | jq 'select(.ms > 2000)'

# Todos los errores
docker compose logs --no-log-prefix storage | jq 'select(.level == "ERROR")'

# Por requestId
docker compose logs --no-log-prefix storage | jq 'select(.requestId == "<id>")'
```

### X-Request-ID — correlación cliente/servidor

```bash
# El cliente recibe: X-Request-ID: f5e6a7b8-...
docker compose logs --no-log-prefix storage | jq 'select(.requestId == "f5e6a7b8-...")'
```

### Health check

```bash
curl http://localhost:3003/health
# 200: {"status":"ok","service":"storage","uptime":3600.5}
# 503: {"status":"degraded","service":"storage","message":"MinIO not reachable"}
```

> El health check llama a `bucketExists()` en MinIO. Un 503 indica que MinIO no responde o el bucket no existe.

### Escenarios comunes de debug

| Síntoma | Qué mirar |
|---------|-----------|
| Upload falla con 503 | `/health` — MinIO no está accesible. Verificar `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY` y que MinIO esté corriendo |
| Upload falla con 400 | `LOG_LEVEL=debug` — puede ser tipo de archivo no permitido, tamaño excedido, o body mal formado |
| Imagen corrupta o sin thumbnail | Buscar `[sharp]` o `[thumbnail]` en logs con `LOG_LEVEL=debug` |
| Upload muy lento | Revisar `ms` en los logs — si supera 5s es problema de red o disco en MinIO |
| Archivo sin antivirus | `STORAGE_ENABLE_AV_SCAN` — si está desactivado, buscar el flag en logs de arranque |
