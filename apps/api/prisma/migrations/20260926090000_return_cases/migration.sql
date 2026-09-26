-- Replace the return approval lifecycle with the two return cases.
ALTER TABLE "Return" RENAME COLUMN "reason" TO "note";

ALTER TABLE "Return" ADD COLUMN "supervisorReceivedQuantity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Return" ADD COLUMN "officeReissueQuantity" INTEGER NOT NULL DEFAULT 0;

UPDATE "Return" SET "supervisorReceivedQuantity" = "quantity", "officeReissueQuantity" = 0;

DROP INDEX "Return_status_idx";

ALTER TABLE "Return" DROP COLUMN "status";
ALTER TABLE "Return" DROP COLUMN "receivedAt";
ALTER TABLE "Return" DROP COLUMN "receivedById";
ALTER TABLE "Return" DROP COLUMN "reissuedAt";
ALTER TABLE "Return" DROP COLUMN "reissuedById";

DROP TYPE "ReturnStatus";

ALTER TABLE "Return" ALTER COLUMN "supervisorReceivedQuantity" DROP DEFAULT;
ALTER TABLE "Return" ALTER COLUMN "officeReissueQuantity" DROP DEFAULT;

ALTER TABLE "Return" ADD CONSTRAINT "Return_cases_nonnegative_check"
  CHECK ("supervisorReceivedQuantity" >= 0 AND "officeReissueQuantity" >= 0);

ALTER TABLE "Return" ADD CONSTRAINT "Return_quantity_matches_cases_check"
  CHECK ("quantity" = "supervisorReceivedQuantity" + "officeReissueQuantity");

ALTER TABLE "Return" ADD CONSTRAINT "Return_cases_total_positive_check"
  CHECK ("supervisorReceivedQuantity" + "officeReissueQuantity" > 0);
