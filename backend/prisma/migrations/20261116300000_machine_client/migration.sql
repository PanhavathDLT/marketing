-- MachineClient: stores external server clients (e.g. LOS backend)
-- Replaces the single static INTERNAL_API_KEY with a named client_id + hashed secret

CREATE TABLE "MachineClient" (
  "id"           SERIAL PRIMARY KEY,
  "clientId"     TEXT NOT NULL,
  "clientSecret" TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MachineClient_clientId_key" UNIQUE ("clientId")
);
