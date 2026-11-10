// Hosting uses Postgres (Neon); local dev keeps SQLite. Writes a Postgres copy of the schema.
import { readFileSync, writeFileSync } from "fs";
const src = readFileSync("prisma/schema.prisma", "utf8");
const out = src.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
if (out === src) throw new Error("sqlite provider not found in prisma/schema.prisma");
writeFileSync("prisma/schema.pg.prisma", out);
console.log("wrote prisma/schema.pg.prisma");
