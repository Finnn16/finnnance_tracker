import { NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/env";
import { getUnlockedAppUserForRequest } from "@/lib/secure-api-user";
import { measureServerOperation } from "@/lib/server-performance";

export const dynamic = "force-dynamic";

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
    budgetableIncome?: number;
    readyToBudget?: number;
    availableToBudget?: number;
    totalBudget?: number;
    spent?: number;
    unbudgetedSpent?: number;
    remainingActiveBudget?: number;
    budgetPlanGap?: number;
    budgetPlanStatus?: string;
    remaining?: number;
    usedPercentage?: number;
    incomeReceivedBeforePeriod?: number;
    incomeReceivedBeforePeriodDate?: string | null;
  };
  coverage?: {
    totalWalletBalance?: number;
    reservedSavings?: number;
    remainingActiveBudget?: number;
    protectedMoney?: number;
    freeCash?: number;
    displayFreeCash?: number;
    cashCoverageGap?: number;
    cashCoverageStatus?: string;
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

function getGeminiModels() {
  const defaults = [
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.5-flash",
  ];

  return Array.from(
    new Set(
      [env.geminiModel, ...env.geminiFallbackModels, ...defaults]
        .map((model) => model.trim())
        .filter(Boolean),
    ),
  );
}

function isNonRetryableGeminiError(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("api key not valid") ||
    normalized.includes("permission denied") ||
    normalized.includes("billing") ||
    normalized.includes("location is not supported")
  );
}

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
    "Focus on free cash, budget plan, cash coverage, and practical next actions.",
    "Differentiate budget plan from cash coverage. Do not call a cash coverage gap a budget problem.",
    'Return ONLY valid JSON with keys: "title", "message", "tone".',
    'tone must be one of: "positive", "warning", "neutral".',
    "title must be short, max 8 words.",
    "message must be one or two sentences, max 240 characters.",
    "",
    `Period: ${input.periodLabel || "unknown"}`,
    `Income: ${toCurrency(input.summary?.income)}`,
    `Expense: ${toCurrency(input.summary?.expense)}`,
    `Net cashflow: ${toCurrency(input.summary?.netCashflow)}`,
    `Operational balance after locked savings: ${toCurrency(input.coverage?.totalWalletBalance ?? input.summary?.totalBalance)}`,
    `Transactions: ${input.summary?.transactionCount || 0}`,
    `Free cash display: ${toCurrency(input.coverage?.displayFreeCash)}`,
    `Free cash raw: ${toCurrency(input.coverage?.freeCash)}`,
    `Reserved savings: ${toCurrency(input.coverage?.reservedSavings)}`,
    `Remaining active budget: ${toCurrency(input.coverage?.remainingActiveBudget ?? input.budget?.remainingActiveBudget)}`,
    `Protected active budget: ${toCurrency(input.coverage?.protectedMoney)}`,
    `Cash coverage gap: ${toCurrency(input.coverage?.cashCoverageGap)}`,
    `Cash coverage status: ${input.coverage?.cashCoverageStatus || "unknown"}`,
    `Ready to budget: ${toCurrency(input.budget?.readyToBudget ?? input.budget?.budgetableIncome)}`,
    `Total budget set: ${toCurrency(input.budget?.totalBudget)}`,
    `Budgeted spent for period: ${toCurrency(input.budget?.spent)}`,
    `Unbudgeted expense for period: ${toCurrency(input.budget?.unbudgetedSpent)}`,
    `Budget period income received before calendar period: ${toCurrency(input.budget?.incomeReceivedBeforePeriod)}`,
    `Budget period income early date: ${input.budget?.incomeReceivedBeforePeriodDate || "none"}`,
    `Budget plan gap: ${toCurrency(input.budget?.budgetPlanGap)}`,
    `Budget plan status: ${input.budget?.budgetPlanStatus || "unknown"}`,
    `Remaining budget: ${toCurrency(input.budget?.remaining)}`,
    `Budget used: ${input.budget?.usedPercentage || 0}%`,
    `Top categories: ${topCategories || "none"}`,
    `Recent transactions: ${recentTransactions || "none"}`,
  ].join("\n");
}

function buildFallbackInsight(input: AiInsightRequest): AiInsightResponse {
  const netCashflow = input.summary?.netCashflow || 0;
  const budgetPlanStatus = input.budget?.budgetPlanStatus || "SAFE";
  const cashCoverageStatus = input.coverage?.cashCoverageStatus || "COVERED";
  const cashCoverageGap = input.coverage?.cashCoverageGap || 0;
  const earlyBudgetIncome = input.budget?.incomeReceivedBeforePeriod || 0;
  const topCategory = input.topCategories?.[0];

  if (cashCoverageStatus === "GAP") {
    return {
      title: "Dana belum tertutup",
      message: `Budget plan bisa saja aman, tapi ada ${toCurrency(cashCoverageGap)} sisa budget yang belum tertutup saldo operasional.`,
      tone: "warning",
    };
  }

  if (netCashflow < 0) {
    if (earlyBudgetIncome > 0) {
      return {
        title: "Cashflow kalender minus",
        message:
          "Budget period tetap bisa aman karena sebagian income periode ini diterima sebelum bulan kalender berjalan.",
        tone: "neutral",
      };
    }

    return {
      title: "Cashflow perlu dijaga",
      message:
        "Pengeluaran bulan ini lebih besar dari income. Fokus ke transaksi terbesar dan budget yang paling cepat habis.",
      tone: "warning",
    };
  }

  if (budgetPlanStatus === "OVERPLANNED") {
    return {
      title: "Budget overplanned",
      message:
        "Budget yang dibuat melebihi dana budget bulan ini. Kurangi envelope atau tambahkan income budgetable.",
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
      "Uang bebas, budget plan, dan perlindungan dana terlihat seimbang untuk periode ini.",
    tone: "positive",
  };
}

function buildFallbackResponse(input: AiInsightRequest, warning: string) {
  return NextResponse.json({
    insight: buildFallbackInsight(input),
    warning,
  });
}

function buildGeminiPayload(input: AiInsightRequest) {
  return {
    systemInstruction: {
      parts: [
        {
          text: "You are a concise personal finance assistant that outputs valid JSON only.",
        },
      ],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: buildPrompt(input) }],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 220,
      responseMimeType: "application/json",
    },
  };
}

async function requestGeminiInsight(input: AiInsightRequest, model: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.geminiTimeoutMs);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  try {
    const response = await measureServerOperation(
      "api /api/ai/insight.gemini",
      () =>
        fetch(endpoint, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": env.geminiApiKey,
          },
          body: JSON.stringify(buildGeminiPayload(input)),
        }),
    );

    const text = await response.text();

    if (!response.ok) {
      return {
        insight: null,
        error: `HTTP ${response.status}: ${text.slice(0, 500)}`,
      };
    }

    const payload = JSON.parse(text) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };
    const content =
      payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("") || "";
    const insight = parseInsight(content);

    if (!insight) {
      return {
        insight: null,
        error: `Unparseable response: ${content.slice(0, 500)}`,
      };
    }

    return { insight, error: null };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return {
        insight: null,
        error: `Gemini request timed out after ${env.geminiTimeoutMs}ms.`,
      };
    }

    return {
      insight: null,
      error:
        error instanceof Error
          ? `Gemini request failed: ${error.message}`
          : "Gemini request failed.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: NextRequest) {
  const auth = await getUnlockedAppUserForRequest("api /api/ai/insight");

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
    if (!env.geminiApiKey) {
      return buildFallbackResponse(
        body,
        "GEMINI_API_KEY belum diset; fallback local insight digunakan.",
      );
    }

    const failures: string[] = [];

    for (const model of getGeminiModels()) {
      const result = await requestGeminiInsight(body, model);

      if (result.insight) {
        return NextResponse.json({
          insight: result.insight,
          model,
        });
      }

      failures.push(`${model} => ${result.error}`);
      console.warn("Gemini model failed:", model, result.error);

      if (result.error && isNonRetryableGeminiError(result.error)) {
        break;
      }
    }

    console.error("All Gemini models failed:", failures.join("\n"));

    return buildFallbackResponse(
      body,
      "Semua model Gemini gagal merespons; insight lokal dipakai sementara.",
    );
  } catch (error) {
    console.error("Failed to generate AI insight:", error);
    return buildFallbackResponse(
      body,
      "Request ke Gemini gagal; fallback local insight digunakan.",
    );
  }
}
