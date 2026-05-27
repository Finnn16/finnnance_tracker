require("dotenv/config");

const { Pool } = require("pg");

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL is required.");
}

const pool = new Pool({ connectionString });

async function main() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const incomeResult = await client.query(`
      WITH income_allocations AS (
        SELECT
          income.id,
          COALESCE(
            SUM(
              CASE
                WHEN ledger.type = 'ADD' THEN ledger.amount
                ELSE 0
              END
            ),
            0
          )::integer AS savings_amount
        FROM transactions AS income
        LEFT JOIN saving_ledgers AS ledger
          ON ledger.source_transaction_id = income.id
        WHERE income.type = 'INCOME'
        GROUP BY income.id
      )
      UPDATE transactions AS income
      SET
        savings_amount = allocation.savings_amount,
        budgetable_amount = GREATEST(
          income.amount - allocation.savings_amount,
          0
        ),
        updated_at = NOW()
      FROM income_allocations AS allocation
      WHERE income.id = allocation.id
        AND (
          income.savings_amount IS DISTINCT FROM allocation.savings_amount
          OR income.budgetable_amount IS DISTINCT FROM GREATEST(
            income.amount - allocation.savings_amount,
            0
          )
        )
      RETURNING income.id
    `);

    await client.query(`
      UPDATE transactions
      SET
        savings_amount = 0,
        budgetable_amount = 0,
        updated_at = NOW()
      WHERE type <> 'INCOME'
        AND (savings_amount <> 0 OR budgetable_amount <> 0)
    `);

    const issues = await client.query(`
      SELECT
        COUNT(*) FILTER (
          WHERE type = 'INCOME' AND budget_month IS NULL
        )::integer AS missing_budget_period,
        COUNT(*) FILTER (
          WHERE type = 'INCOME' AND savings_amount > amount
        )::integer AS invalid_savings_amount
      FROM transactions
    `);

    await client.query("COMMIT");

    const audit = issues.rows[0];
    console.log(
      `Backfilled ${incomeResult.rowCount} income transaction(s) with savings and budgetable amounts.`,
    );
    console.log(
      `Audit: ${audit.missing_budget_period} income transaction(s) have no budget period; ${audit.invalid_savings_amount} income transaction(s) have savings above income.`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
