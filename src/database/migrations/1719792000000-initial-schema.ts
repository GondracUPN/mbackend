import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1719792000000 implements MigrationInterface {
  name = 'InitialSchema1719792000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pg_trgm"');
    await queryRunner.query(`CREATE TYPE "role_name_enum" AS ENUM
      ('ADMIN', 'SELLER', 'OPTOMETRIST', 'RECEPTIONIST', 'READ_ONLY')`);
    await queryRunner.query(
      `CREATE TYPE "customer_status_enum" AS ENUM ('ACTIVE', 'INACTIVE')`,
    );

    await queryRunner.query(`
      CREATE TABLE "companies" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "legal_name" varchar(160) NOT NULL,
        "slug" varchar(60) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "version" integer NOT NULL DEFAULT 1,
        "deleted_at" timestamptz,
        CONSTRAINT "pk_companies" PRIMARY KEY ("id"),
        CONSTRAINT "uq_companies_slug" UNIQUE ("slug")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "branches" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "name" varchar(120) NOT NULL,
        "code" varchar(30) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "version" integer NOT NULL DEFAULT 1,
        "deleted_at" timestamptz,
        CONSTRAINT "pk_branches" PRIMARY KEY ("id"),
        CONSTRAINT "uq_branches_company_code" UNIQUE ("company_id", "code"),
        CONSTRAINT "fk_branches_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" role_name_enum NOT NULL,
        "label" varchar(100) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "version" integer NOT NULL DEFAULT 1,
        "deleted_at" timestamptz,
        CONSTRAINT "pk_roles" PRIMARY KEY ("id"),
        CONSTRAINT "uq_roles_name" UNIQUE ("name")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "branch_id" uuid,
        "full_name" varchar(160) NOT NULL,
        "email" varchar(180) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "version" integer NOT NULL DEFAULT 1,
        "deleted_at" timestamptz,
        CONSTRAINT "pk_users" PRIMARY KEY ("id"),
        CONSTRAINT "uq_users_company_email" UNIQUE ("company_id", "email"),
        CONSTRAINT "fk_users_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_users_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "user_roles" (
        "user_id" uuid NOT NULL,
        "role_id" uuid NOT NULL,
        CONSTRAINT "pk_user_roles" PRIMARY KEY ("user_id", "role_id"),
        CONSTRAINT "fk_user_roles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_user_roles_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "customers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "created_in_branch_id" uuid NOT NULL,
        "dni" char(8) NOT NULL,
        "first_names" varchar(120) NOT NULL,
        "last_names" varchar(120) NOT NULL,
        "search_text" varchar(300) NOT NULL,
        "birth_date" date NOT NULL,
        "address" varchar(300) NOT NULL,
        "phone" varchar(30) NOT NULL,
        "phone_normalized" varchar(20) NOT NULL,
        "status" customer_status_enum NOT NULL DEFAULT 'ACTIVE',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "version" integer NOT NULL DEFAULT 1,
        "deleted_at" timestamptz,
        CONSTRAINT "pk_customers" PRIMARY KEY ("id"),
        CONSTRAINT "uq_customers_company_dni" UNIQUE ("company_id", "dni"),
        CONSTRAINT "ck_customers_dni" CHECK ("dni" ~ '^[0-9]{8}$'),
        CONSTRAINT "ck_customers_birth_date" CHECK ("birth_date" <= CURRENT_DATE),
        CONSTRAINT "fk_customers_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_customers_branch" FOREIGN KEY ("created_in_branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "idx_customers_company_status" ON "customers" ("company_id", "status") WHERE "deleted_at" IS NULL',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_customers_search_trgm" ON "customers" USING gin ("search_text" gin_trgm_ops)',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_customers_phone" ON "customers" ("company_id", "phone_normalized")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_customers_created_at" ON "customers" ("company_id", "created_at" DESC)',
    );

    await queryRunner.query(`
      CREATE TABLE "customer_consents" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "customer_id" uuid NOT NULL,
        "accepted" boolean NOT NULL,
        "accepted_at" timestamptz,
        "notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_customer_consents" PRIMARY KEY ("id"),
        CONSTRAINT "fk_consents_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_consents_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "idx_consents_customer_created" ON "customer_consents" ("customer_id", "created_at" DESC)',
    );

    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "entity_type" varchar(80) NOT NULL,
        "entity_id" uuid NOT NULL,
        "action" varchar(80) NOT NULL,
        "field_name" varchar(80),
        "old_value" text,
        "new_value" text,
        "user_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_audit_logs" PRIMARY KEY ("id"),
        CONSTRAINT "fk_audit_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_audit_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "idx_audit_entity" ON "audit_logs" ("company_id", "entity_type", "entity_id", "created_at" DESC)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "audit_logs"');
    await queryRunner.query('DROP TABLE IF EXISTS "customer_consents"');
    await queryRunner.query('DROP TABLE IF EXISTS "customers"');
    await queryRunner.query('DROP TABLE IF EXISTS "user_roles"');
    await queryRunner.query('DROP TABLE IF EXISTS "users"');
    await queryRunner.query('DROP TABLE IF EXISTS "roles"');
    await queryRunner.query('DROP TABLE IF EXISTS "branches"');
    await queryRunner.query('DROP TABLE IF EXISTS "companies"');
    await queryRunner.query('DROP TYPE IF EXISTS "customer_status_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "role_name_enum"');
  }
}
