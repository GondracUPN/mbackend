import { MigrationInterface, QueryRunner } from 'typeorm';

export class PerformanceIndexes1720051200000 implements MigrationInterface {
  name = 'PerformanceIndexes1720051200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_customers_active_list"
      ON "customers" ("company_id", "status", "last_names", "id")
      WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_customers_deleted_list"
      ON "customers" ("company_id", "last_names", "id")
      WHERE "deleted_at" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_active_email_lower"
      ON "users" (LOWER("email"))
      WHERE "deleted_at" IS NULL AND "is_active" = true
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_prescriptions_company_created"
      ON "prescriptions" ("company_id", "created_at" DESC)
      WHERE "deleted_at" IS NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "idx_prescriptions_company_created"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "idx_users_active_email_lower"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "idx_customers_deleted_list"',
    );
    await queryRunner.query('DROP INDEX IF EXISTS "idx_customers_active_list"');
  }
}
