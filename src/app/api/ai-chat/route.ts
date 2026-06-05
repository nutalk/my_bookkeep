import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import {
  assets,
  liabilities,
  transactions,
  categories,
  monthlySnapshots,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const { messages, apiKey, baseUrl, model } = body as {
      messages: ChatMessage[];
      apiKey: string;
      baseUrl: string;
      model: string;
    };

    if (!apiKey) {
      return NextResponse.json({ error: "请先配置 API Key" }, { status: 400 });
    }

    if (!messages || !messages.length) {
      return NextResponse.json({ error: "消息不能为空" }, { status: 400 });
    }

    // Fetch user's financial data
    const [
      userAssets,
      userLiabilities,
      userCategories,
      recentTransactions,
      latestSnapshot,
    ] = await Promise.all([
      db.select().from(assets).where(eq(assets.userId, user.id)),
      db.select().from(liabilities).where(eq(liabilities.userId, user.id)),
      db.select().from(categories).where(eq(categories.userId, user.id)),
      db
        .select()
        .from(transactions)
        .where(eq(transactions.userId, user.id))
        .orderBy(desc(transactions.transactionDate))
        .limit(20),
      db
        .select()
        .from(monthlySnapshots)
        .where(eq(monthlySnapshots.userId, user.id))
        .orderBy(desc(monthlySnapshots.month))
        .limit(1),
    ]);

    // Build financial context for the system prompt
    const financialContext = buildFinancialContext(
      userAssets,
      userLiabilities,
      userCategories,
      recentTransactions,
      latestSnapshot[0] ?? null,
    );

    const systemPrompt = `你是一位专业的家庭财务顾问，正在帮助用户分析和管理他们的财务状况。

## 用户的财务数据

${financialContext}

## 回答要求

1. 基于上述真实财务数据回答用户的问题，数据要精确
2. 如果用户询问的数据不在上述信息中，请如实告知
3. 提供投资理财、负债管理、现金流优化等方面的专业建议
4. 回答使用中文，语言要亲切易懂
5. 涉及金额时，使用人民币格式（如 ¥123,456.78）
6. 可以提问以获取更多信息，帮助用户更好地管理财务
7. 不要编造不存在的资产、负债或交易数据`;

    const fullMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    // Call OpenAI-compatible API
    const endpoint = (baseUrl || "https://api.openai.com/v1").replace(
      /\/+$/,
      "",
    );
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || "gpt-4o",
        messages: fullMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      return NextResponse.json(
        { error: `AI 接口调用失败 (${response.status})` },
        { status: 502 },
      );
    }

    // Return the streaming response directly
    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("AI chat error:", e);
    return NextResponse.json({ error: "AI 聊天服务异常" }, { status: 500 });
  }
}

function buildFinancialContext(
  userAssets: Array<{
    name: string;
    type: string;
    currentValue: number;
    monthlyIncome: number | null;
    annualYield: number | null;
    isActive: boolean;
    note: string | null;
  }>,
  userLiabilities: Array<{
    name: string;
    type: string;
    totalPrincipal: number;
    remainingPrincipal: number;
    annualRate: number;
    repaymentMethod: string;
    monthlyPayment: number;
    paymentDay: number | null;
    startDate: string | Date | null;
    endDate: string | Date | null;
    isActive: boolean;
    note: string | null;
  }>,
  userCategories: Array<{
    name: string;
    type: string;
  }>,
  recentTransactions: Array<{
    type: string;
    amount: number;
    description: string;
    transactionDate: string | Date;
    principalPart: number | null;
    interestPart: number | null;
  }>,
  latestSnapshot: {
    month: string;
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
    monthlyCashFlow: number;
  } | null,
) {
  const lines: string[] = [];

  // Summary
  const totalAssets = userAssets.reduce((s, a) => s + a.currentValue, 0);
  const totalLiabilities = userLiabilities.reduce(
    (s, l) => s + l.remainingPrincipal,
    0,
  );
  const netWorth = totalAssets - totalLiabilities;

  lines.push("=== 财务概览 ===");
  lines.push(
    `总资产: ¥${totalAssets.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`,
  );
  lines.push(
    `总负债: ¥${totalLiabilities.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`,
  );
  lines.push(
    `净资产: ¥${netWorth.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`,
  );

  if (latestSnapshot) {
    lines.push(
      `最新月度统计 (${latestSnapshot.month}): 总资产 ¥${latestSnapshot.totalAssets}, 总负债 ¥${latestSnapshot.totalLiabilities}, 净资产 ¥${latestSnapshot.netWorth}, 月现金流 ¥${latestSnapshot.monthlyCashFlow}`,
    );
  }

  // Assets detail
  lines.push("\n=== 资产明细 ===");
  const assetTypeLabels: Record<string, string> = {
    real_estate: "房产",
    deposit: "存款",
    investment: "投资",
    income_source: "收入来源",
    other: "其他",
  };

  for (const a of userAssets) {
    const monthlyInc = a.monthlyIncome ? `, 月收入: ¥${a.monthlyIncome}` : "";
    const yieldStr = a.annualYield ? `, 年化收益率: ${a.annualYield}%` : "";
    const noteStr = a.note ? ` (备注: ${a.note})` : "";
    lines.push(
      `- ${a.name} [${assetTypeLabels[a.type] ?? a.type}]${a.isActive ? "" : " (已停用)"}: ¥${a.currentValue}${monthlyInc}${yieldStr}${noteStr}`,
    );
  }

  // Liabilities detail
  lines.push("\n=== 负债明细 ===");
  const liabilityTypeLabels: Record<string, string> = {
    mortgage: "房贷",
    car_loan: "车贷",
    credit_card: "信用卡",
    personal_loan: "个人贷款",
    other: "其他",
  };
  const repaymentLabels: Record<string, string> = {
    equal_installment: "等额本息",
    interest_only: "按月付息到期还本",
    lump_sum: "一次性到期还本付息",
  };

  for (const l of userLiabilities) {
    const start = l.startDate
      ? `, 开始: ${new Date(l.startDate).toLocaleDateString("zh-CN")}`
      : "";
    const end = l.endDate
      ? `, 到期: ${new Date(l.endDate).toLocaleDateString("zh-CN")}`
      : "";
    const day = l.paymentDay ? `, 还款日: 每月${l.paymentDay}日` : "";
    const noteStr = l.note ? ` (备注: ${l.note})` : "";
    const method = repaymentLabels[l.repaymentMethod] ?? l.repaymentMethod;
    lines.push(
      `- ${l.name} [${liabilityTypeLabels[l.type] ?? l.type}]${l.isActive ? "" : " (已结清)"}: 总额 ¥${l.totalPrincipal}, 剩余 ¥${l.remainingPrincipal}, 年利率 ${l.annualRate}%, 还款方式: ${method}, 月供: ¥${l.monthlyPayment}${start}${end}${day}${noteStr}`,
    );
  }

  // Categories
  if (userCategories.length > 0) {
    lines.push("\n=== 分类 ===");
    for (const c of userCategories) {
      lines.push(`- ${c.name} (${c.type})`);
    }
  }

  // Recent transactions
  if (recentTransactions.length > 0) {
    lines.push("\n=== 最近交易记录 (最近20条) ===");
    const transactionTypeLabels: Record<string, string> = {
      asset_value_change: "资产价值变动",
      asset_income: "资产收益",
      liability_repayment: "负债还款",
      liability_principal_change: "负债本金变动",
      expense: "支出",
      income: "收入",
      transfer: "转账",
      reconciliation: "对账调整",
    };
    for (const t of recentTransactions) {
      const date = new Date(t.transactionDate).toLocaleDateString("zh-CN");
      const typeLabel = transactionTypeLabels[t.type] ?? t.type;
      let amountStr = `¥${t.amount}`;
      if (t.principalPart || t.interestPart) {
        amountStr += ` (本金: ¥${t.principalPart ?? 0}, 利息: ¥${t.interestPart ?? 0})`;
      }
      lines.push(`- [${date}] ${typeLabel}: ${amountStr} - ${t.description}`);
    }
  }

  return lines.join("\n");
}
