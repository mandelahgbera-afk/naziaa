// A fresh in-memory Postgres with every migration in supabase/migrations applied,
// plus helpers to act as anon, a signed-in user or the server (service role).

import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

export async function freshDb() {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(read("tests/supabase-stub.sql"));
  const dir = new URL("supabase/migrations/", root);
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    try {
      await db.exec(read(`supabase/migrations/${file}`));
    } catch (e) {
      throw new Error(`migration ${file} failed: ${e.message}`);
    }
  }
  return db;
}

/** Who is asking: anon (signed out), a signed-in user, or the server's service role. */
export const anon = { role: "anon", id: null };
export const serviceRole = { role: "service_role", id: null };
export const signedIn = (id) => ({ role: "authenticated", id });

/** Runs one statement as `who`, in its own transaction, the way one API request runs. */
export async function as(db, who, sql, params = []) {
  return db.transaction(async (tx) => {
    await tx.query(`set local role ${who.role}`);
    await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: who.id ?? "", role: who.role })]);
    return (await tx.query(sql, params)).rows;
  });
}

/** Runs as the database owner (setting up fixtures, reading the truth). */
export async function rows(db, sql, params = []) {
  return (await db.query(sql, params)).rows;
}
