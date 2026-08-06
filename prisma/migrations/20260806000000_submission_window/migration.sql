ALTER TABLE "AppConfig"
ADD COLUMN "submissionsOpen" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "submissionStartAt" TIMESTAMP(3),
ADD COLUMN "submissionEndAt" TIMESTAMP(3),
ADD COLUMN "submissionClosedMessage" TEXT NOT NULL DEFAULT 'Hiện không trong thời gian nhận hồ sơ.';
