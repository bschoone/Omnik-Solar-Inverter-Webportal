/** OpenAPI 3.0 document for Scalar / tooling. */

export function buildOpenApiSpec() {
  return {
    openapi: "3.0.3",
    info: {
      title: "Solar inverter backend",
      version: "1.0.0",
      description:
        "Omnik / Wi‑Fi stick ingestion (TCP push/pull, HTTP fallback), SQLite samples, admin DB ops.",
    },
    servers: [{ url: "/", description: "Same origin" }],
    components: {
      securitySchemes: {
        AdminToken: {
          type: "apiKey",
          in: "header",
          name: "X-Admin-Token",
          description: "Set to same value as ADMIN_API_TOKEN env, or use Authorization: Bearer <token>",
        },
        BackupToken: {
          type: "apiKey",
          in: "header",
          name: "X-Backup-Token",
          description: "Set to BACKUP_API_TOKEN",
        },
      },
    },
    paths: {
      "/api/health": {
        get: {
          summary: "Health check",
          responses: { "200": { description: "OK", content: { "application/json": { schema: { type: "object" } } } } },
        },
      },
      "/api/current": {
        get: {
          summary: "Latest sample and per-source snapshots",
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/history": {
        get: {
          summary: "Bucketed history (days capped at 90)",
          parameters: [
            { name: "days", in: "query", schema: { type: "number", default: 7, maximum: 90 } },
            { name: "bucket_seconds", in: "query", schema: { type: "integer", default: 10, maximum: 3600 } },
          ],
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/analytics/dashboard": {
        get: {
          summary: "Dashboard analytics bundle (energy, ingestion, histogram, hourly profile)",
          parameters: [
            { name: "days", in: "query", schema: { type: "number", default: 7, maximum: 90 } },
            { name: "bucket_seconds", in: "query", schema: { type: "integer", default: 600, maximum: 3600 } },
            { name: "histogram_bins", in: "query", schema: { type: "integer", default: 24, maximum: 48 } },
          ],
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/poll": {
        post: {
          summary: "TCP pull then HTTP fallback once",
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/samples": {
        get: {
          summary: "Paginated samples rows",
          parameters: [
            { name: "from", in: "query", schema: { type: "integer" } },
            { name: "to", in: "query", schema: { type: "integer" } },
            { name: "source", in: "query", schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer", default: 100 } },
            { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
          ],
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/sources": {
        get: {
          summary: "Distinct data_source values",
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/raw-events": {
        get: {
          summary:
            "Paginated raw_events (full payload as payload_hex, payload_length; parse_error null if parsed OK)",
          parameters: [
            { name: "from", in: "query", schema: { type: "integer" } },
            { name: "to", in: "query", schema: { type: "integer" } },
            { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
            { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
          ],
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/admin/db/stats": {
        get: {
          summary: "SQLite table counts",
          security: [{ AdminToken: [] }],
          responses: { "200": { description: "OK" }, "401": { description: "Unauthorized" } },
        },
      },
      "/api/admin/db/purge-samples": {
        post: {
          summary: "Delete samples (range, by source, or all with confirm)",
          security: [{ AdminToken: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    before_ts: { type: "integer" },
                    source: { type: "string" },
                    all: { type: "boolean" },
                    confirm: { type: "string", description: 'Required "DELETE_SAMPLES" when all=true' },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "OK" }, "401": { description: "Unauthorized" } },
        },
      },
      "/api/admin/db/purge-raw-events": {
        post: {
          summary: "Truncate raw_events or delete before timestamp",
          security: [{ AdminToken: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    all: { type: "boolean" },
                    before_ts: { type: "integer" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/admin/db/vacuum": {
        post: {
          summary: "Run SQLite VACUUM",
          security: [{ AdminToken: [] }],
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/admin/backup": {
        post: {
          summary: "On-demand SQLite backup file",
          security: [{ BackupToken: [] }],
          responses: { "200": { description: "OK" }, "401": { description: "Unauthorized" } },
        },
      },
    },
  };
}
