import { MigrationInterface, QueryRunner } from 'typeorm';

export class PrescriptionsAndOrders1719878400000 implements MigrationInterface {
  name = 'PrescriptionsAndOrders1719878400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "prescriptions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(), "company_id" uuid NOT NULL,
        "customer_id" uuid NOT NULL, "current_version_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
        "version" integer NOT NULL DEFAULT 1, "deleted_at" timestamptz,
        CONSTRAINT "pk_prescriptions" PRIMARY KEY ("id"),
        CONSTRAINT "fk_prescriptions_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_prescriptions_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "idx_prescriptions_company_customer" ON "prescriptions" ("company_id", "customer_id") WHERE "deleted_at" IS NULL',
    );
    await queryRunner.query(`
      CREATE TABLE "prescription_versions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(), "prescription_id" uuid NOT NULL,
        "version_number" integer NOT NULL, "prescription_date" date NOT NULL,
        "measurement_place" varchar(160) NOT NULL, "specialist_name" varchar(160) NOT NULL,
        "specialist_type" varchar(100) NOT NULL,
        "right_sphere" numeric(5,2) NOT NULL, "right_cylinder" numeric(5,2) NOT NULL,
        "right_axis" smallint, "right_add" numeric(5,2), "right_prism" numeric(5,2),
        "left_sphere" numeric(5,2) NOT NULL, "left_cylinder" numeric(5,2) NOT NULL,
        "left_axis" smallint, "left_add" numeric(5,2), "left_prism" numeric(5,2),
        "created_by_id" uuid NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_prescription_versions" PRIMARY KEY ("id"),
        CONSTRAINT "uq_prescription_version" UNIQUE ("prescription_id", "version_number"),
        CONSTRAINT "fk_versions_prescription" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_versions_user" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_rx_date" CHECK ("prescription_date" <= CURRENT_DATE),
        CONSTRAINT "ck_rx_right_sphere" CHECK ("right_sphere" BETWEEN -29.00 AND 26.75 AND mod("right_sphere" * 4, 1) = 0),
        CONSTRAINT "ck_rx_left_sphere" CHECK ("left_sphere" BETWEEN -29.00 AND 26.75 AND mod("left_sphere" * 4, 1) = 0),
        CONSTRAINT "ck_rx_right_cylinder" CHECK ("right_cylinder" BETWEEN -10.00 AND 10.00 AND mod("right_cylinder" * 4, 1) = 0),
        CONSTRAINT "ck_rx_left_cylinder" CHECK ("left_cylinder" BETWEEN -10.00 AND 10.00 AND mod("left_cylinder" * 4, 1) = 0),
        CONSTRAINT "ck_rx_right_axis" CHECK (("right_cylinder" = 0 AND "right_axis" IS NULL) OR ("right_cylinder" <> 0 AND "right_axis" BETWEEN 0 AND 180)),
        CONSTRAINT "ck_rx_left_axis" CHECK (("left_cylinder" = 0 AND "left_axis" IS NULL) OR ("left_cylinder" <> 0 AND "left_axis" BETWEEN 0 AND 180)),
        CONSTRAINT "ck_rx_right_add" CHECK ("right_add" IS NULL OR ("right_add" BETWEEN 0 AND 10 AND mod("right_add" * 4, 1) = 0)),
        CONSTRAINT "ck_rx_left_add" CHECK ("left_add" IS NULL OR ("left_add" BETWEEN 0 AND 10 AND mod("left_add" * 4, 1) = 0)),
        CONSTRAINT "ck_rx_right_prism" CHECK ("right_prism" IS NULL OR "right_prism" BETWEEN 0 AND 20),
        CONSTRAINT "ck_rx_left_prism" CHECK ("left_prism" IS NULL OR "left_prism" BETWEEN 0 AND 20)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "idx_prescription_versions_history" ON "prescription_versions" ("prescription_id", "version_number" DESC)',
    );
    await queryRunner.query(
      'ALTER TABLE "prescriptions" ADD CONSTRAINT "fk_prescriptions_current_version" FOREIGN KEY ("current_version_id") REFERENCES "prescription_versions"("id") ON DELETE RESTRICT',
    );
    await queryRunner.query(`
      CREATE TABLE "work_orders" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(), "company_id" uuid NOT NULL,
        "prescription_id" uuid NOT NULL, "prescription_version_id" uuid NOT NULL,
        "elaboration_date" date NOT NULL, "lens_type" varchar(160) NOT NULL,
        "laboratory" varchar(160) NOT NULL, "receipt_number" varchar(60) NOT NULL,
        "sale_price" numeric(12,2) NOT NULL, "discount" numeric(12,2) NOT NULL DEFAULT 0,
        "final_price" numeric(12,2) NOT NULL, "created_by_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
        "version" integer NOT NULL DEFAULT 1, "deleted_at" timestamptz,
        CONSTRAINT "pk_work_orders" PRIMARY KEY ("id"),
        CONSTRAINT "fk_orders_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_orders_prescription" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_orders_version" FOREIGN KEY ("prescription_version_id") REFERENCES "prescription_versions"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_orders_user" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_order_date" CHECK ("elaboration_date" <= CURRENT_DATE),
        CONSTRAINT "ck_order_amounts" CHECK ("sale_price" >= 0 AND "discount" >= 0 AND "discount" <= "sale_price" AND "final_price" = "sale_price" - "discount")
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "idx_orders_prescription" ON "work_orders" ("company_id", "prescription_id", "created_at" DESC) WHERE "deleted_at" IS NULL',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "work_orders"');
    await queryRunner.query(
      'ALTER TABLE "prescriptions" DROP CONSTRAINT IF EXISTS "fk_prescriptions_current_version"',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "prescription_versions"');
    await queryRunner.query('DROP TABLE IF EXISTS "prescriptions"');
  }
}
