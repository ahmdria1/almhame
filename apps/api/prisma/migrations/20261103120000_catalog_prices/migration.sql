-- Published prices no longer include a chambers plan.
UPDATE "User" SET "planCode" = 'pro' WHERE "planCode"::text = 'office';
UPDATE "PaymentIntent" SET "planCode" = 'pro' WHERE "planCode"::text = 'office';
DELETE FROM "PlanSetting" WHERE "code"::text = 'office';

ALTER TYPE "PlanCode" RENAME TO "PlanCode_old";
CREATE TYPE "PlanCode" AS ENUM ('free', 'basic', 'pro');

ALTER TABLE "User" ALTER COLUMN "planCode" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "planCode" TYPE "PlanCode" USING ("planCode"::text::"PlanCode");
ALTER TABLE "User" ALTER COLUMN "planCode" SET DEFAULT 'free';

ALTER TABLE "PaymentIntent" ALTER COLUMN "planCode" TYPE "PlanCode" USING (
  CASE WHEN "planCode" IS NULL THEN NULL ELSE "planCode"::text::"PlanCode" END
);

ALTER TABLE "PlanSetting" ALTER COLUMN "code" TYPE "PlanCode" USING ("code"::text::"PlanCode");

DROP TYPE "PlanCode_old";

ALTER TABLE "User" ADD COLUMN "chatCredits" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PaymentIntent" ADD COLUMN "serviceCode" TEXT;
