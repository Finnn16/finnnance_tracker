import { TransactionType } from "@/lib/prisma-enums";

export type CategoryPayload = {
  name: string;
  type: TransactionType;
  group: string;
  isHidden: boolean;
};

const categoryTypes = new Set<string>([
  TransactionType.EXPENSE,
  TransactionType.INCOME,
]);

export function createCategoryKey(name: string, type: TransactionType) {
  const key = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return `${key || "category"}_${type.toLowerCase()}`;
}

export function createCategoryGroupKey(name: string, type: TransactionType) {
  const key = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return `group_${key || "category"}_${type.toLowerCase()}`;
}

export function validateCategoryPayload(
  body: unknown,
): { ok: true; data: CategoryPayload } | { ok: false; error: string } {
  const input = body as {
    name?: unknown;
    type?: unknown;
    group?: unknown;
    isHidden?: unknown;
  } | null;

  const name = typeof input?.name === "string" ? input.name.trim() : "";

  if (name.length < 2 || name.length > 60) {
    return { ok: false, error: "Category name must be 2-60 characters." };
  }

  const type = typeof input?.type === "string" ? input.type : "";

  if (!categoryTypes.has(type as TransactionType)) {
    return { ok: false, error: "Invalid category type." };
  }

  const group = typeof input?.group === "string" ? input.group.trim() : "";

  if (group.length < 2 || group.length > 40) {
    return { ok: false, error: "Group must be 2-40 characters." };
  }

  return {
    ok: true,
    data: {
      name,
      type: type as TransactionType,
      group,
      isHidden: input?.isHidden === true,
    },
  };
}
