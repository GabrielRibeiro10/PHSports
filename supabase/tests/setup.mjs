import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const MIG = fileURLToPath(new URL("../migrations", import.meta.url));
export async function makeDb() {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; create table auth.users (id uuid primary key, email text);
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt()->>'sub','')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on all functions in schema auth to anon, authenticated, service_role;
    create schema storage; create table storage.buckets (id text primary key, name text, public boolean);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;
    grant usage on schema public to anon, authenticated, service_role;

    -- Igual ao Supabase: toda tabela/função nova em public já nasce liberada para anon/authenticated (RLS decide)
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  `);
  for (const f of fs.readdirSync(MIG).sort()) {
    let sql = fs.readFileSync(`${MIG}/${f}`, "utf8");
    sql = sql.replace(/alter publication supabase_realtime[^;]*;/gi, "null;");
    try { await db.exec(sql); } catch (e) { throw new Error(`migração ${f}: ${e.message}`); }
  }
  await db.exec(`grant select, insert, update, delete on all tables in schema public to service_role;`);
  return db;
}
/** Executa como um papel do Supabase (anon / authenticated com claims / service_role). */
export async function as(db, role, claims, fn) {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${role}; select set_config('request.jwt.claims', '${JSON.stringify(claims ?? {})}', true);`);
    return fn(tx);
  });
}
