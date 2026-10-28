import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`home_sections_hero_slides\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`image_id\` integer,
  	\`button_link\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`home_sections\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`home_sections_hero_slides_order_idx\` ON \`home_sections_hero_slides\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`home_sections_hero_slides_parent_id_idx\` ON \`home_sections_hero_slides\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`home_sections_hero_slides_image_idx\` ON \`home_sections_hero_slides\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`home_sections_hero_slides_locales\` (
  	\`title\` text NOT NULL,
  	\`subtitle\` text,
  	\`button_label\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`home_sections_hero_slides\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`home_sections_hero_slides_locales_locale_parent_id_unique\` ON \`home_sections_hero_slides_locales\` (\`_locale\`,\`_parent_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`home_sections_hero_slides\`;`)
  await db.run(sql`DROP TABLE \`home_sections_hero_slides_locales\`;`)
}
