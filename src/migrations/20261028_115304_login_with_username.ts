import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

import { USERNAME_MAX, usernameFromEmail } from '../lib/username'

// Staff can sign in with a username or their email (auth.loginWithUsername).
// The column is nullable, so nothing breaks for an account without one, but every existing
// account gets a username here from its email's local part (made unique with "-<id>" when two
// would clash), before the unique index is created. Everyone can still sign in with their email.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`users\` ADD \`username\` text;`)

  const rows = (await db.all(sql`SELECT \`id\`, \`email\` FROM \`users\` ORDER BY \`id\`;`)) as {
    id: number
    email: string | null
  }[]
  const taken = new Set<string>()
  for (const { id, email } of rows) {
    const base = usernameFromEmail(email ?? '') || 'user'
    let username = base
    for (let n = id; taken.has(username); n++)
      username = `${base.slice(0, USERNAME_MAX - String(n).length - 1)}-${n}`
    taken.add(username)
    await db.run(sql`UPDATE \`users\` SET \`username\` = ${username} WHERE \`id\` = ${id};`)
  }

  await db.run(sql`CREATE UNIQUE INDEX \`users_username_idx\` ON \`users\` (\`username\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`users_username_idx\`;`)
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`username\`;`)
}
