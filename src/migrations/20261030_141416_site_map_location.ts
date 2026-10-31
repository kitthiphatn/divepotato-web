import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`site_settings\` ADD \`contact_map_location\` text;`)
  // The shop's real location, given by the owner on 2026-10-30, so existing sites show the map
  await db.run(
    sql`UPDATE \`site_settings\` SET \`contact_map_location\` = '13.83776148801082, 100.60349854232841';`,
  )
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`site_settings\` DROP COLUMN \`contact_map_location\`;`)
}
