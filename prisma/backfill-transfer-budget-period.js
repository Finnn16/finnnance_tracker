require("dotenv/config");

const { Pool } = require("pg");

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL is required.");
}

const pool = new Pool({ connectionString });

async function main() {
  const result = await pool.query(`
    UPDATE transactions
    SET
      budget_month = NULL,
      is_prepaid = FALSE,
      updated_at = NOW()
    WHERE type = 'TRANSFER'
      AND (budget_month IS NOT NULL OR is_prepaid = TRUE)
    RETURNING id
  `);

  console.log(
    `Cleared budget period from ${result.rowCount} transfer transaction(s).`,
  );

  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exitCode = 1;
});
