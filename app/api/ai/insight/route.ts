import { NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/env";
import { getUnlockedAppUserForRequest } from "@/lib/secure-api-user";

type AiInsightRequest = {
  periodLabel?: string;
  summary?: {
    income?: number;
    expense?: number;
    totalBalance?: number;
    netCashflow?: number;
    transactionCount?: number;
  };
  budget?: {
    availableToBudget?: number;
    budgetedAmount?: number;
    unallocatedAmount?: number;
    overplannedAmount?: number;
    status?: string;
    usedPercentage?: number;
  };
  topCategories?: Array<{
    name?: string;
    amount?: number;
    percentage?: number;
  }>;
  recentTransactions?: Array<{
    type?: string;
    amount?: number;
    description?: string;
    categoryName?: string | null;
    budgetCategoryName?: string | null;
    walletName?: string;
  }>;
};

type AiInsightResponse = {
  title: string;
  message: string;
  tone: "positive" | "warning" | "neutral";
};

const OPENROUTER_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";

function toCurrency(value: number | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function extractJsonObject(content: string) {
  const trimmed = content.trim();

  if (trimmed.startsWith("{")) {
    return trimmed;
  }

  const match = trimmed.match(/\{[\s\S]*\}/);

  return match ? match[0] : "";
}

function parseInsight(content: string): AiInsightResponse | null {
  const jsonText = extractJsonObject(content);

  if (!jsonText) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonText) as Partial<AiInsightResponse>;

    if (
      typeof parsed.title !== "string" ||
      typeof parsed.message !== "string"
    ) {
      return null;
    }

    const tone =
      parsed.tone === "positive" ||
      parsed.tone === "warning" ||
      parsed.tone === "neutral"
        ? parsed.tone
        : "neutral";

    return {
      title: parsed.title.trim().slice(0, 80),
      message: parsed.message.trim().slice(0, 240),
      tone,
    };
  } catch {
    return null;
  }
}

function buildPrompt(input: AiInsightRequest) {
  const topCategories = (input.topCategories || [])
    .map((category) => {
      return `${category.name || "Unknown"}: ${toCurrency(category.amount)} (${category.percentage || 0}%)`;
    })
    .join("; ");

  const recentTransactions = (input.recentTransactions || [])
    .map((transaction) => {
      const source =
        transaction.budgetCategoryName ||
        transaction.categoryName ||
        transaction.walletName ||
        "unknown";

      return `${transaction.type || "UNKNOWN"}: ${transaction.description || "No description"} | ${source} | ${toCurrency(transaction.amount)}`;
    })
    .join("; ");

  return [
    "You are a concise personal finance assistant for an internal two-user household tracker.",
    "Use only the provided numbers and avoid mentioning that you are an AI.",
    "Write in Indonesian.",
    "Focus on salary-based monthly finance, budget health, and practical next actions.",
    'Return ONLY valid JSON with keys: "title", "message", "tone".',
    'tone must be one of: "positive", "warning", "neutral".',
    "title must be short, max 8 words.",
    "message must be one or two sentences, max 240 characters.",
    "",
    `Period: ${input.periodLabel || "unknown"}`,
    `Income: ${toCurrency(input.summary?.income)}`,
    `Expense: ${toCurrency(input.summary?.expense)}`,
    `Net cashflow: ${toCurrency(input.summary?.netCashflow)}`,
    `Total balance: ${toCurrency(input.summary?.totalBalance)}`,
    `Transactions: ${input.summary?.transactionCount || 0}`,
    `Budget available: ${toCurrency(input.budget?.availableToBudget)}`,
    `Budgeted: ${toCurrency(input.budget?.budgetedAmount)}`,
    `Unallocated: ${toCurrency(input.budget?.unallocatedAmount)}`,
    `Overplanned: ${toCurrency(input.budget?.overplannedAmount)}`,
    `Budget status: ${input.budget?.status || "unknown"}`,
    `Budget used: ${input.budget?.usedPercentage || 0}%`,
    `Top categories: ${topCategories || "none"}`,
    `Recent transactions: ${recentTransactions || "none"}`,
  ].join("\n");
}

function buildFallbackInsight(input: AiInsightRequest): AiInsightResponse {
  const netCashflow = input.summary?.netCashflow || 0;
  const budgetStatus = input.budget?.status || "SAFE";
  const overplanned = input.budget?.overplannedAmount || 0;
  const topCategory = input.topCategories?.[0];

  if (netCashflow < 0) {
    return {
      title: "Cashflow perlu dijaga",
      message:
        "Pengeluaran bulan ini lebih besar dari income. Fokus ke transaksi terbesar dan budget yang paling cepat habis.",
      tone: "warning",
    };
  }

  if (budgetStatus === "OVERPLANNED" || overplanned > 0) {
    return {
      title: "Budget mulai mepet",
      message:
        "Income masih aman, tapi budget bulan ini sudah melebihi batas. Cek envelope yang paling cepat habis.",
      tone: "warning",
    };
  }

  if (topCategory?.name) {
    return {
      title: `${topCategory.name} dominan`,
      message:
        "Pengeluaran paling besar masih terkonsentrasi di satu kategori. Ini bagus untuk dipantau lebih detail.",
      tone: "neutral",
    };
  }

  return {
    title: "Kondisi stabil",
    message:
      "Income, saldo, dan budget terlihat cukup seimbang untuk periode ini.",
    tone: "positive",
  };
}

function buildFallbackResponse(input: AiInsightRequest, warning: string) {
  return NextResponse.json({
    insight: buildFallbackInsight(input),
    warning,
  });
}

export async function POST(request: NextRequest) {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const body = (await request
    .json()
    .catch(() => null)) as AiInsightRequest | null;

  if (!body?.summary) {
    return NextResponse.json(
      { error: "Dashboard data is required." },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.openrouterApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          temperature: 0.3,
          max_tokens: 220,
          messages: [
            {
              role: "system",
              content:
                "You are a concise personal finance assistant that outputs valid JSON only.",
            },
            {
              role: "user",
              content: buildPrompt(body),
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("OpenRouter request failed:", response.status, text);
      return NextResponse.json(
        { error: "Failed to generate AI insight." },
        { status: 502 },
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: { content?: string };
      }>;
    };

    const content = payload.choices?.[0]?.message?.content || "";
    const insight = parseInsight(content);

    if (!insight) {
      return buildFallbackResponse(
        body,
        "OpenRouter mengembalikan respons yang tidak bisa diparse; fallback local insight digunakan.",
      );
    }

    return NextResponse.json({ insight });
  } catch (error) {
    console.error("Failed to generate AI insight:", error);
    return buildFallbackResponse(
      body,
      "Request ke OpenRouter gagal; fallback local insight digunakan.",
    );
  }
}
