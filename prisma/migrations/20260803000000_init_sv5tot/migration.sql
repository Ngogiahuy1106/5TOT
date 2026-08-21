-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "mssv" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "evidenceImages" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppConfig" (
    "key" TEXT NOT NULL,
    "linkDeXuatHoatDong" TEXT,
    "linkXacNhanClb" TEXT,
    "linkXacNhanNgoaiKhoa" TEXT,
    "linkXacNhanChung" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "Submission_mssv_idx" ON "Submission"("mssv");
