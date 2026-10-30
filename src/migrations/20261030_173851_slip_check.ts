import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`payments\` ADD \`slip_ref\` text;`)
  await db.run(sql`ALTER TABLE \`payments\` ADD \`slip_check\` text;`)
  await db.run(sql`CREATE INDEX \`payments_slip_ref_idx\` ON \`payments\` (\`slip_ref\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`payments_slip_ref_idx\`;`)
  await db.run(sql`ALTER TABLE \`payments\` DROP COLUMN \`slip_ref\`;`)
  await db.run(sql`ALTER TABLE \`payments\` DROP COLUMN \`slip_check\`;`)
}
