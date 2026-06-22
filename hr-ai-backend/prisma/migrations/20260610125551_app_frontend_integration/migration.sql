-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "OnboardingState" AS ENUM ('OFF', 'ON', 'OFFBOARDING');

-- CreateEnum
CREATE TYPE "HrRequestKind" AS ENUM ('VACATION', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "HrRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "HrRequestPriority" AS ENUM ('NORMAL', 'URGENT');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "AiMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AiSafetyStatus" AS ENUM ('ALLOWED', 'BLOCKED', 'ERROR');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "address" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "performanceScore" INTEGER NOT NULL DEFAULT 80,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "presenceScore" INTEGER NOT NULL DEFAULT 92,
ADD COLUMN     "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "vacationBalanceDays" INTEGER NOT NULL DEFAULT 12;

-- AlterTable
ALTER TABLE "GeneratedDocument" ADD COLUMN     "downloads" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "fileType" TEXT NOT NULL DEFAULT 'TXT',
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sizeBytes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "HrDocument" ADD COLUMN     "downloads" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "fileType" TEXT NOT NULL DEFAULT 'PDF',
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sizeBytes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "onboardingState" "OnboardingState" NOT NULL DEFAULT 'OFF';

-- AlterTable
ALTER TABLE "WorkflowTask" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "locked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phase" TEXT NOT NULL DEFAULT 'General',
ADD COLUMN     "stepOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "HrRequest" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "kind" "HrRequestKind" NOT NULL,
    "requestType" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "durationDays" DECIMAL(5,2),
    "priority" "HrRequestPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "HrRequestStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "comment" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HrRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeRiskAlert" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "level" "RiskLevel" NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "factors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiScore" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "EmployeeRiskAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "roleScope" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT,
    "role" "AiMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "model" TEXT,
    "safetyStatus" "AiSafetyStatus" NOT NULL DEFAULT 'ALLOWED',
    "latencyMs" INTEGER,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiMessage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "HrRequest" ADD CONSTRAINT "HrRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrRequest" ADD CONSTRAINT "HrRequest_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeRiskAlert" ADD CONSTRAINT "EmployeeRiskAlert_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiMessage" ADD CONSTRAINT "AiMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiMessage" ADD CONSTRAINT "AiMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
