/*
  Warnings:

  - You are about to drop the column `priority` on the `tasks` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "LeaveDurationType" AS ENUM ('FULL_DAY', 'HALF_DAY', 'TIME_BASED');

-- CreateEnum
CREATE TYPE "HalfDayPeriod" AS ENUM ('MORNING', 'AFTERNOON');

-- AlterEnum
ALTER TYPE "LeaveType" ADD VALUE 'BIRTHDAY';

-- AlterTable
ALTER TABLE "leaves" ADD COLUMN     "durationType" "LeaveDurationType" NOT NULL DEFAULT 'FULL_DAY',
ADD COLUMN     "endTime" TEXT,
ADD COLUMN     "halfDayPeriod" "HalfDayPeriod",
ADD COLUMN     "minutesUsed" INTEGER,
ADD COLUMN     "startTime" TEXT;

-- AlterTable
ALTER TABLE "tasks" DROP COLUMN "priority",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedById" TEXT,
ADD COLUMN     "documentConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "documentConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "documentConfirmedBy" TEXT,
ADD COLUMN     "documentDetails" TEXT,
ADD COLUMN     "documentNotes" TEXT,
ADD COLUMN     "documentsComplete" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "birthMonth" INTEGER,
ADD COLUMN     "employmentStartDate" TIMESTAMP(3),
ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "leave_quotas" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "totalQuota" DOUBLE PRECISION NOT NULL,
    "usedDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pendingDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_quotas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leave_quotas_userId_year_idx" ON "leave_quotas"("userId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "leave_quotas_userId_year_leaveType_key" ON "leave_quotas"("userId", "year", "leaveType");

-- CreateIndex
CREATE INDEX "cars_status_idx" ON "cars"("status");

-- CreateIndex
CREATE INDEX "leaves_userId_status_idx" ON "leaves"("userId", "status");

-- CreateIndex
CREATE INDEX "leaves_type_idx" ON "leaves"("type");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "sub_units_departmentId_idx" ON "sub_units"("departmentId");

-- CreateIndex
CREATE INDEX "sub_units_type_idx" ON "sub_units"("type");

-- CreateIndex
CREATE INDEX "task_assignments_userId_idx" ON "task_assignments"("userId");

-- CreateIndex
CREATE INDEX "tasks_scheduledDate_idx" ON "tasks"("scheduledDate");

-- CreateIndex
CREATE INDEX "tasks_carId_idx" ON "tasks"("carId");
