-- CreateTable
CREATE TABLE "SyncVault" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "payload" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
