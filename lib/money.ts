export function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function parseIntegerAmount(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/[^\d-]/g, "");

  if (!normalized || normalized === "-") {
    return null;
  }

  const amount = Number(normalized);

  return Number.isInteger(amount) ? amount : null;
}
