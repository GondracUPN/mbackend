import { MigrationInterface, QueryRunner } from 'typeorm';

export class UnlimitedAddAndPrism1720137600000 implements MigrationInterface {
  name = 'UnlimitedAddAndPrism1720137600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "prescription_versions" DROP CONSTRAINT "ck_rx_right_add"',
    );
    await queryRunner.query(
      'ALTER TABLE "prescription_versions" DROP CONSTRAINT "ck_rx_left_add"',
    );
    await queryRunner.query(
      'ALTER TABLE "prescription_versions" DROP CONSTRAINT "ck_rx_right_prism"',
    );
    await queryRunner.query(
      'ALTER TABLE "prescription_versions" DROP CONSTRAINT "ck_rx_left_prism"',
    );
    await queryRunner.query(`
      ALTER TABLE "prescription_versions"
      ALTER COLUMN "right_add" TYPE numeric,
      ALTER COLUMN "left_add" TYPE numeric,
      ALTER COLUMN "right_prism" TYPE numeric,
      ALTER COLUMN "left_prism" TYPE numeric
    `);
    await queryRunner.query(
      'ALTER TABLE "prescription_versions" ADD CONSTRAINT "ck_rx_right_add" CHECK ("right_add" IS NULL OR "right_add" >= 0)',
    );
    await queryRunner.query(
      'ALTER TABLE "prescription_versions" ADD CONSTRAINT "ck_rx_left_add" CHECK ("left_add" IS NULL OR "left_add" >= 0)',
    );
    await queryRunner.query(
      'ALTER TABLE "prescription_versions" ADD CONSTRAINT "ck_rx_right_prism" CHECK ("right_prism" IS NULL OR "right_prism" >= 0)',
    );
    await queryRunner.query(
      'ALTER TABLE "prescription_versions" ADD CONSTRAINT "ck_rx_left_prism" CHECK ("left_prism" IS NULL OR "left_prism" >= 0)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "prescription_versions" DROP CONSTRAINT "ck_rx_right_add"',
    );
    await queryRunner.query(
      'ALTER TABLE "prescription_versions" DROP CONSTRAINT "ck_rx_left_add"',
    );
    await queryRunner.query(
      'ALTER TABLE "prescription_versions" DROP CONSTRAINT "ck_rx_right_prism"',
    );
    await queryRunner.query(
      'ALTER TABLE "prescription_versions" DROP CONSTRAINT "ck_rx_left_prism"',
    );
    await queryRunner.query(`
      ALTER TABLE "prescription_versions"
      ALTER COLUMN "right_add" TYPE numeric(5,2),
      ALTER COLUMN "left_add" TYPE numeric(5,2),
      ALTER COLUMN "right_prism" TYPE numeric(5,2),
      ALTER COLUMN "left_prism" TYPE numeric(5,2)
    `);
    await queryRunner.query(
      'ALTER TABLE "prescription_versions" ADD CONSTRAINT "ck_rx_right_add" CHECK ("right_add" IS NULL OR ("right_add" BETWEEN 0 AND 10 AND mod("right_add" * 4, 1) = 0))',
    );
    await queryRunner.query(
      'ALTER TABLE "prescription_versions" ADD CONSTRAINT "ck_rx_left_add" CHECK ("left_add" IS NULL OR ("left_add" BETWEEN 0 AND 10 AND mod("left_add" * 4, 1) = 0))',
    );
    await queryRunner.query(
      'ALTER TABLE "prescription_versions" ADD CONSTRAINT "ck_rx_right_prism" CHECK ("right_prism" IS NULL OR "right_prism" BETWEEN 0 AND 20)',
    );
    await queryRunner.query(
      'ALTER TABLE "prescription_versions" ADD CONSTRAINT "ck_rx_left_prism" CHECK ("left_prism" IS NULL OR "left_prism" BETWEEN 0 AND 20)',
    );
  }
}
