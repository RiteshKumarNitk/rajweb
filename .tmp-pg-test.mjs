import pg from "pg";
const p = new pg.Pool({ connectionString: "postgres://postgres:postgres@127.0.0.1:51214/template1?sslmode=disable" });
try {
  const r = await p.query("SELECT count(*) FROM settings");
  console.log("plain pg OK:", r.rows[0]);
} catch (e) { console.log("plain pg FAIL:", e.message); }
try {
  const r2 = await p.query("SELECT count(*) FROM users");
  console.log("second query OK:", r2.rows[0]);
} catch (e) { console.log("second query FAIL:", e.message); }
await p.end();
