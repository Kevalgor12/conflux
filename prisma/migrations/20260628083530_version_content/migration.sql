-- AlterTable
ALTER TABLE "DocumentSnapshot" ADD COLUMN     "content" JSONB,
ALTER COLUMN "state" DROP NOT NULL,
ALTER COLUMN "snapshot" DROP NOT NULL;
