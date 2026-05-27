require("dotenv/config");

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { Pool } = require("pg");

const defaultData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "default-data.json"), "utf8"),
);

const walletTypeMap = {
  cash: "CASH",
  e_wallet: "EWALLET",
  bank: "BANK",
  digital_bank: "DIGITAL_BANK",
  credit_card: "CREDIT_CARD",
  paylater: "PAYLATER",
  investment: "INVESTMENT",
  asset: "ASSET",
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
});

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value.toLowerCase();
}

function displayNameFromEmail(email) {
  if (email === process.env.ADMIN_EMAIL?.toLowerCase()) {
    return "Finnn";
  }

  if (email === process.env.USER_EMAIL?.toLowerCase()) {
    return "Awaaa";
  }

  return email.split("@")[0];
}

async function upsertUser(client, email, role) {
  const result = await client.query(
    `
      INSERT INTO users (id, email, name, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      ON CONFLICT (email)
      DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        updated_at = NOW()
      RETURNING id, email
    `,
    [crypto.randomUUID(), email, displayNameFromEmail(email), role],
  );

  return result.rows[0];
}

function isTransferFallback(key) {
  return [
    "transfer_in",
    "transfer_out",
    "cash_withdrawal",
    "cash_deposit",
  ].includes(key);
}

async function upsertCategoryNode(client, node, context) {
  const isLeaf = !node.children || node.children.length === 0;
  const result = await client.query(
    `
      INSERT INTO categories (
        id,
        parent_id,
        key,
        name,
        "group",
        type,
        level,
        is_selectable,
        is_fallback,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      ON CONFLICT (key, type)
      DO UPDATE SET
        parent_id = EXCLUDED.parent_id,
        name = EXCLUDED.name,
        "group" = EXCLUDED."group",
        level = EXCLUDED.level,
        is_selectable = EXCLUDED.is_selectable,
        is_fallback = EXCLUDED.is_fallback,
        updated_at = NOW()
      RETURNING id
    `,
    [
      crypto.randomUUID(),
      context.parentId,
      node.key,
      node.name,
      context.group,
      context.type,
      context.level,
      isLeaf,
      isTransferFallback(node.key),
    ],
  );

  const categoryId = result.rows[0].id;

  for (const child of node.children || []) {
    await upsertCategoryNode(client, child, {
      parentId: categoryId,
      group: context.group,
      type: context.type,
      level: context.level + 1,
    });
  }
}

async function seedCategoryGroups(client, groups, type) {
  for (const group of groups) {
    await upsertCategoryNode(client, group, {
      parentId: null,
      group: group.key,
      type,
      level: 0,
    });
  }
}

function collectCategoryKeys(groups) {
  const keys = new Set();

  function visit(node) {
    keys.add(node.key);

    for (const child of node.children || []) {
      visit(child);
    }
  }

  for (const group of groups) {
    visit(group);
  }

  return [...keys];
}

async function deleteUnusedStaleCategories(client, groups, type) {
  const keys = collectCategoryKeys(groups);

  await client.query(
    `
      DELETE FROM categories
      WHERE type = $1
        AND NOT (key = ANY($2::text[]))
        AND NOT EXISTS (
          SELECT 1
          FROM transactions
          WHERE transactions.category_id = categories.id
        )
    `,
    [type, keys],
  );
}

async function ensureDefaultWallet(client, userId) {
  const wallet = defaultData.wallets.find(
    (item) => item.key === defaultData.defaultWalletKey,
  );

  if (!wallet) {
    throw new Error(`Default wallet ${defaultData.defaultWalletKey} not found`);
  }

  const hasDefault = await client.query(
    `SELECT 1 FROM wallets WHERE user_id = $1 AND is_default = TRUE LIMIT 1`,
    [userId],
  );
  const shouldBeDefault = hasDefault.rowCount === 0;

  await client.query(
    `
      INSERT INTO wallets (
        id,
        user_id,
        key,
        name,
        type,
        initial_balance,
        current_balance,
        is_default,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, 0, 0, $6, NOW(), NOW())
      ON CONFLICT (user_id, key)
      DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        is_default = wallets.is_default OR EXCLUDED.is_default,
        updated_at = NOW()
    `,
    [
      crypto.randomUUID(),
      userId,
      wallet.key,
      wallet.name,
      walletTypeMap[wallet.type] || "OTHER",
      shouldBeDefault,
    ],
  );
}

async function main() {
  const adminEmail = requiredEnv("ADMIN_EMAIL");
  const userEmail = requiredEnv("USER_EMAIL");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const users = [
      await upsertUser(client, adminEmail, "ADMIN"),
      await upsertUser(client, userEmail, "ADMIN"),
    ];

    await seedCategoryGroups(
      client,
      defaultData.expenseCategoryGroups,
      "EXPENSE",
    );
    await seedCategoryGroups(
      client,
      defaultData.incomeCategoryGroups,
      "INCOME",
    );
    await deleteUnusedStaleCategories(
      client,
      defaultData.expenseCategoryGroups,
      "EXPENSE",
    );
    await deleteUnusedStaleCategories(
      client,
      defaultData.incomeCategoryGroups,
      "INCOME",
    );

    for (const user of users) {
      await ensureDefaultWallet(client, user.id);
    }

    await client.query("COMMIT");

    console.log(
      `Seeded ${users.length} users, ${defaultData.expenseCategoryGroups.length} expense category groups, ${defaultData.incomeCategoryGroups.length} income category groups, and BCA default wallets.`,
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
  process.exit(1);
});
