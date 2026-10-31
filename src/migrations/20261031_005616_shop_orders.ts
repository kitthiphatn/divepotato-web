import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`orders_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`variant_id\` integer NOT NULL,
  	\`title\` text NOT NULL,
  	\`size\` text,
  	\`sku\` text,
  	\`unit_price\` numeric NOT NULL,
  	\`qty\` numeric NOT NULL,
  	\`line_total\` numeric DEFAULT 0,
  	FOREIGN KEY (\`variant_id\`) REFERENCES \`product_variants\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`orders\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`orders_items_order_idx\` ON \`orders_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`orders_items_parent_id_idx\` ON \`orders_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`orders_items_variant_idx\` ON \`orders_items\` (\`variant_id\`);`)
  await db.run(sql`CREATE TABLE \`orders_timeline\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`at\` text NOT NULL,
  	\`event\` text NOT NULL,
  	\`by_id\` integer,
  	\`note\` text,
  	FOREIGN KEY (\`by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`orders\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`orders_timeline_order_idx\` ON \`orders_timeline\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`orders_timeline_parent_id_idx\` ON \`orders_timeline\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`orders_timeline_by_idx\` ON \`orders_timeline\` (\`by_id\`);`)
  await db.run(sql`CREATE TABLE \`orders\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`code\` text,
  	\`status\` text DEFAULT 'pending_payment' NOT NULL,
  	\`hold_expires_at\` text,
  	\`pay_token\` text,
  	\`stock_deducted\` integer DEFAULT false,
  	\`customer_id\` integer NOT NULL,
  	\`delivery\` text DEFAULT 'pickup' NOT NULL,
  	\`tracking_no\` text,
  	\`address_line\` text,
  	\`address_district\` text,
  	\`address_province\` text,
  	\`address_postcode\` text,
  	\`subtotal\` numeric DEFAULT 0,
  	\`shipping_fee\` numeric DEFAULT 0,
  	\`total\` numeric DEFAULT 0,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`customer_id\`) REFERENCES \`customers\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`orders_code_idx\` ON \`orders\` (\`code\`);`)
  await db.run(sql`CREATE INDEX \`orders_status_idx\` ON \`orders\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`orders_customer_idx\` ON \`orders\` (\`customer_id\`);`)
  await db.run(sql`CREATE INDEX \`orders_updated_at_idx\` ON \`orders\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`orders_created_at_idx\` ON \`orders\` (\`created_at\`);`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payments\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`booking_id\` integer,
  	\`order_id\` integer,
  	\`provider\` text DEFAULT 'slip' NOT NULL,
  	\`method\` text,
  	\`kind\` text DEFAULT 'deposit' NOT NULL,
  	\`amount\` numeric NOT NULL,
  	\`status\` text DEFAULT 'pending' NOT NULL,
  	\`ref\` text,
  	\`slip_id\` integer,
  	\`slip_ref\` text,
  	\`slip_check\` text,
  	\`reviewed_by_id\` integer,
  	\`reviewed_at\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`booking_id\`) REFERENCES \`bookings\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`order_id\`) REFERENCES \`orders\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`slip_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`reviewed_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payments\`("id", "booking_id", "order_id", "provider", "method", "kind", "amount", "status", "ref", "slip_id", "slip_ref", "slip_check", "reviewed_by_id", "reviewed_at", "updated_at", "created_at") SELECT "id", "booking_id", NULL, "provider", "method", "kind", "amount", "status", "ref", "slip_id", "slip_ref", "slip_check", "reviewed_by_id", "reviewed_at", "updated_at", "created_at" FROM \`payments\`;`)
  await db.run(sql`DROP TABLE \`payments\`;`)
  await db.run(sql`ALTER TABLE \`__new_payments\` RENAME TO \`payments\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`payments_booking_idx\` ON \`payments\` (\`booking_id\`);`)
  await db.run(sql`CREATE INDEX \`payments_order_idx\` ON \`payments\` (\`order_id\`);`)
  await db.run(sql`CREATE INDEX \`payments_status_idx\` ON \`payments\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`payments_slip_idx\` ON \`payments\` (\`slip_id\`);`)
  await db.run(sql`CREATE INDEX \`payments_slip_ref_idx\` ON \`payments\` (\`slip_ref\`);`)
  await db.run(sql`CREATE INDEX \`payments_reviewed_by_idx\` ON \`payments\` (\`reviewed_by_id\`);`)
  await db.run(sql`CREATE INDEX \`payments_updated_at_idx\` ON \`payments\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payments_created_at_idx\` ON \`payments\` (\`created_at\`);`)
  // Rebuilt instead of ALTER TABLE ADD so the new foreign key gets ON DELETE cascade like the
  // others; otherwise dev schema push sees a difference and fails recreating the table
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
	\`id\` integer PRIMARY KEY NOT NULL,
	\`order\` integer,
	\`parent_id\` integer NOT NULL,
	\`path\` text NOT NULL,
	\`bookings_id\` integer,
	\`departures_id\` integer,
	\`customers_id\` integer,
	\`payments_id\` integer,
	\`trips_id\` integer,
	\`courses_id\` integer,
	\`dive_sites_id\` integer,
	\`products_id\` integer,
	\`product_variants_id\` integer,
	\`orders_id\` integer,
	\`rental_items_id\` integer,
	\`posts_id\` integer,
	\`faqs_id\` integer,
	\`media_id\` integer,
	\`users_id\` integer,
	\`audit_logs_id\` integer,
	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`bookings_id\`) REFERENCES \`bookings\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`departures_id\`) REFERENCES \`departures\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`customers_id\`) REFERENCES \`customers\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`payments_id\`) REFERENCES \`payments\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`trips_id\`) REFERENCES \`trips\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`courses_id\`) REFERENCES \`courses\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`dive_sites_id\`) REFERENCES \`dive_sites\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`products_id\`) REFERENCES \`products\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`product_variants_id\`) REFERENCES \`product_variants\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`orders_id\`) REFERENCES \`orders\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`rental_items_id\`) REFERENCES \`rental_items\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`posts_id\`) REFERENCES \`posts\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`faqs_id\`) REFERENCES \`faqs\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`audit_logs_id\`) REFERENCES \`audit_logs\`(\`id\`) ON UPDATE no action ON DELETE cascade
)
`)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "bookings_id", "departures_id", "customers_id", "payments_id", "trips_id", "courses_id", "dive_sites_id", "products_id", "product_variants_id", "orders_id", "rental_items_id", "posts_id", "faqs_id", "media_id", "users_id", "audit_logs_id") SELECT "id", "order", "parent_id", "path", "bookings_id", "departures_id", "customers_id", "payments_id", "trips_id", "courses_id", "dive_sites_id", "products_id", "product_variants_id", NULL, "rental_items_id", "posts_id", "faqs_id", "media_id", "users_id", "audit_logs_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_bookings_id_idx\` ON \`payload_locked_documents_rels\` (\`bookings_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_departures_id_idx\` ON \`payload_locked_documents_rels\` (\`departures_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_customers_id_idx\` ON \`payload_locked_documents_rels\` (\`customers_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_payments_id_idx\` ON \`payload_locked_documents_rels\` (\`payments_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_trips_id_idx\` ON \`payload_locked_documents_rels\` (\`trips_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_courses_id_idx\` ON \`payload_locked_documents_rels\` (\`courses_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_dive_sites_id_idx\` ON \`payload_locked_documents_rels\` (\`dive_sites_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_products_id_idx\` ON \`payload_locked_documents_rels\` (\`products_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_product_variants_id_idx\` ON \`payload_locked_documents_rels\` (\`product_variants_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_rental_items_id_idx\` ON \`payload_locked_documents_rels\` (\`rental_items_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_posts_id_idx\` ON \`payload_locked_documents_rels\` (\`posts_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_faqs_id_idx\` ON \`payload_locked_documents_rels\` (\`faqs_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_audit_logs_id_idx\` ON \`payload_locked_documents_rels\` (\`audit_logs_id\`);`)
  await db.run(sql`ALTER TABLE \`booking_settings\` ADD \`pickup_enabled\` integer DEFAULT true;`)
  await db.run(sql`ALTER TABLE \`booking_settings\` ADD \`shipping_enabled\` integer DEFAULT true;`)
  await db.run(sql`ALTER TABLE \`booking_settings\` ADD \`shipping_fee\` numeric DEFAULT 100 NOT NULL;`)
  await db.run(sql`ALTER TABLE \`booking_settings\` ADD \`free_shipping_min\` numeric DEFAULT 3000;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`orders_items\`;`)
  await db.run(sql`DROP TABLE \`orders_timeline\`;`)
  await db.run(sql`DROP TABLE \`orders\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payments\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`booking_id\` integer NOT NULL,
  	\`provider\` text DEFAULT 'slip' NOT NULL,
  	\`method\` text,
  	\`kind\` text DEFAULT 'deposit' NOT NULL,
  	\`amount\` numeric NOT NULL,
  	\`status\` text DEFAULT 'pending' NOT NULL,
  	\`ref\` text,
  	\`slip_id\` integer,
  	\`slip_ref\` text,
  	\`slip_check\` text,
  	\`reviewed_by_id\` integer,
  	\`reviewed_at\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`booking_id\`) REFERENCES \`bookings\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`slip_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`reviewed_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payments\`("id", "booking_id", "provider", "method", "kind", "amount", "status", "ref", "slip_id", "slip_ref", "slip_check", "reviewed_by_id", "reviewed_at", "updated_at", "created_at") SELECT "id", "booking_id", "provider", "method", "kind", "amount", "status", "ref", "slip_id", "slip_ref", "slip_check", "reviewed_by_id", "reviewed_at", "updated_at", "created_at" FROM \`payments\` WHERE "booking_id" IS NOT NULL;`)
  await db.run(sql`DROP TABLE \`payments\`;`)
  await db.run(sql`ALTER TABLE \`__new_payments\` RENAME TO \`payments\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`payments_booking_idx\` ON \`payments\` (\`booking_id\`);`)
  await db.run(sql`CREATE INDEX \`payments_status_idx\` ON \`payments\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`payments_slip_idx\` ON \`payments\` (\`slip_id\`);`)
  await db.run(sql`CREATE INDEX \`payments_slip_ref_idx\` ON \`payments\` (\`slip_ref\`);`)
  await db.run(sql`CREATE INDEX \`payments_reviewed_by_idx\` ON \`payments\` (\`reviewed_by_id\`);`)
  await db.run(sql`CREATE INDEX \`payments_updated_at_idx\` ON \`payments\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payments_created_at_idx\` ON \`payments\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`bookings_id\` integer,
  	\`departures_id\` integer,
  	\`customers_id\` integer,
  	\`payments_id\` integer,
  	\`trips_id\` integer,
  	\`courses_id\` integer,
  	\`dive_sites_id\` integer,
  	\`products_id\` integer,
  	\`product_variants_id\` integer,
  	\`rental_items_id\` integer,
  	\`posts_id\` integer,
  	\`faqs_id\` integer,
  	\`media_id\` integer,
  	\`users_id\` integer,
  	\`audit_logs_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`bookings_id\`) REFERENCES \`bookings\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`departures_id\`) REFERENCES \`departures\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`customers_id\`) REFERENCES \`customers\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`payments_id\`) REFERENCES \`payments\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`trips_id\`) REFERENCES \`trips\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`courses_id\`) REFERENCES \`courses\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`dive_sites_id\`) REFERENCES \`dive_sites\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`products_id\`) REFERENCES \`products\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`product_variants_id\`) REFERENCES \`product_variants\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`rental_items_id\`) REFERENCES \`rental_items\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`posts_id\`) REFERENCES \`posts\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`faqs_id\`) REFERENCES \`faqs\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`audit_logs_id\`) REFERENCES \`audit_logs\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "bookings_id", "departures_id", "customers_id", "payments_id", "trips_id", "courses_id", "dive_sites_id", "products_id", "product_variants_id", "rental_items_id", "posts_id", "faqs_id", "media_id", "users_id", "audit_logs_id") SELECT "id", "order", "parent_id", "path", "bookings_id", "departures_id", "customers_id", "payments_id", "trips_id", "courses_id", "dive_sites_id", "products_id", "product_variants_id", "rental_items_id", "posts_id", "faqs_id", "media_id", "users_id", "audit_logs_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_bookings_id_idx\` ON \`payload_locked_documents_rels\` (\`bookings_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_departures_id_idx\` ON \`payload_locked_documents_rels\` (\`departures_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_customers_id_idx\` ON \`payload_locked_documents_rels\` (\`customers_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_payments_id_idx\` ON \`payload_locked_documents_rels\` (\`payments_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_trips_id_idx\` ON \`payload_locked_documents_rels\` (\`trips_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_courses_id_idx\` ON \`payload_locked_documents_rels\` (\`courses_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_dive_sites_id_idx\` ON \`payload_locked_documents_rels\` (\`dive_sites_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_products_id_idx\` ON \`payload_locked_documents_rels\` (\`products_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_product_variants_id_idx\` ON \`payload_locked_documents_rels\` (\`product_variants_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_rental_items_id_idx\` ON \`payload_locked_documents_rels\` (\`rental_items_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_posts_id_idx\` ON \`payload_locked_documents_rels\` (\`posts_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_faqs_id_idx\` ON \`payload_locked_documents_rels\` (\`faqs_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_audit_logs_id_idx\` ON \`payload_locked_documents_rels\` (\`audit_logs_id\`);`)
  await db.run(sql`ALTER TABLE \`booking_settings\` DROP COLUMN \`pickup_enabled\`;`)
  await db.run(sql`ALTER TABLE \`booking_settings\` DROP COLUMN \`shipping_enabled\`;`)
  await db.run(sql`ALTER TABLE \`booking_settings\` DROP COLUMN \`shipping_fee\`;`)
  await db.run(sql`ALTER TABLE \`booking_settings\` DROP COLUMN \`free_shipping_min\`;`)
}
