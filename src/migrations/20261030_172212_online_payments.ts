import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`booking_settings_pay_methods\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`booking_settings\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`booking_settings_pay_methods_order_idx\` ON \`booking_settings_pay_methods\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`booking_settings_pay_methods_parent_idx\` ON \`booking_settings_pay_methods\` (\`parent_id\`);`)
  await db.run(sql`ALTER TABLE \`bookings\` ADD \`pay_token\` text;`)
  await db.run(sql`ALTER TABLE \`payments\` ADD \`method\` text;`)
  await db.run(sql`ALTER TABLE \`booking_settings\` ADD \`payment_provider\` text DEFAULT 'demo' NOT NULL;`)
  await db.run(sql`ALTER TABLE \`booking_settings\` ADD \`bank_name\` text;`)
  await db.run(sql`ALTER TABLE \`booking_settings\` ADD \`account_name\` text;`)
  await db.run(sql`ALTER TABLE \`booking_settings\` ADD \`account_number\` text;`)
  await db.run(sql`ALTER TABLE \`booking_settings\` DROP COLUMN \`omise_public_key\`;`)
  await db.run(sql`ALTER TABLE \`booking_settings\` DROP COLUMN \`omise_secret_key\`;`)
  await db.run(sql`ALTER TABLE \`booking_settings\` DROP COLUMN \`prompt_pay_id\`;`)
  // Existing sites offer all three methods, as a new site does by default
  await db.run(sql`INSERT INTO \`booking_settings_pay_methods\` (\`order\`, \`parent_id\`, \`value\`)
    SELECT 1, \`id\`, 'card' FROM \`booking_settings\`
    UNION ALL SELECT 2, \`id\`, 'promptpay' FROM \`booking_settings\`
    UNION ALL SELECT 3, \`id\`, 'transfer' FROM \`booking_settings\`;`)
  // Existing bookings get a pay link too
  await db.run(
    sql`UPDATE \`bookings\` SET \`pay_token\` = lower(hex(randomblob(18))) WHERE \`pay_token\` IS NULL;`,
  )
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`booking_settings_pay_methods\`;`)
  await db.run(sql`ALTER TABLE \`booking_settings\` ADD \`omise_public_key\` text;`)
  await db.run(sql`ALTER TABLE \`booking_settings\` ADD \`omise_secret_key\` text;`)
  await db.run(sql`ALTER TABLE \`booking_settings\` ADD \`prompt_pay_id\` text;`)
  await db.run(sql`ALTER TABLE \`booking_settings\` DROP COLUMN \`payment_provider\`;`)
  await db.run(sql`ALTER TABLE \`booking_settings\` DROP COLUMN \`bank_name\`;`)
  await db.run(sql`ALTER TABLE \`booking_settings\` DROP COLUMN \`account_name\`;`)
  await db.run(sql`ALTER TABLE \`booking_settings\` DROP COLUMN \`account_number\`;`)
  await db.run(sql`ALTER TABLE \`bookings\` DROP COLUMN \`pay_token\`;`)
  await db.run(sql`ALTER TABLE \`payments\` DROP COLUMN \`method\`;`)
}
