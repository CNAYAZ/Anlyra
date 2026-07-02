-- Migration: add_reports_dashboards_notifications
-- Adds Report_b8, CustomDashboard_b8, NotificationPref_b8

CREATE TABLE "Report_b8" (
    "id"             TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "title"          TEXT NOT NULL,
    "description"    TEXT,
    "sections"       TEXT NOT NULL,
    "schedule"       TEXT,
    "recipients"     TEXT,
    "lastRunAt"      DATETIME,
    "createdAt"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      DATETIME NOT NULL
);
CREATE INDEX "Report_b8_organizationId_idx" ON "Report_b8"("organizationId");

CREATE TABLE "CustomDashboard_b8" (
    "id"             TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name"           TEXT NOT NULL,
    "description"    TEXT,
    "widgets"        TEXT NOT NULL,
    "createdAt"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      DATETIME NOT NULL
);
CREATE INDEX "CustomDashboard_b8_organizationId_idx" ON "CustomDashboard_b8"("organizationId");

CREATE TABLE "NotificationPref_b8" (
    "id"             TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "userId"         TEXT NOT NULL,
    "channel"        TEXT NOT NULL,
    "category"       TEXT NOT NULL,
    "enabled"        BOOLEAN NOT NULL DEFAULT 1,
    "updatedAt"      DATETIME NOT NULL
);
CREATE UNIQUE INDEX "NotificationPref_b8_userId_organizationId_channel_category_key"
    ON "NotificationPref_b8"("userId", "organizationId", "channel", "category");
