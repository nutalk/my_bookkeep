import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import {
  assets,
  liabilities,
  transactions,
  categories,
  monthlySnapshots,
  chatSessions,
  chatMessages,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { parseActions, executeAction, type ActionName } from "./actions";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface RequestBody {
  // Page mode: full message array
  messages?: ChatMessage[];
  // Panel mode: session-based
  sessionId?: number;
  content?: string;
  // Config
  apiKey: string;
  baseUrl: string;
  model: string;
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as RequestBody;
    const { apiKey, baseUrl, model, sessionId: sid, content } = body;
    let { messages } = body;

    if (!apiKey) {
      return NextResponse.json({ error: "请先配置 API Key" }, { status: 400 });
    }

    // Panel mode: build messages from session history + new user message
    if (sid && content) {
      // Verify session belongs to user
      const sessionRows = await db
        .select()
        .from(chatSessions)
        .where(eq(chatSessions.id, sid))
        .limit(1);

      if (!sessionRows.length || sessionRows[0].userId !== user.id) {
        return NextResponse.json({ error: "会话不存在" }, { status: 404 });
      }

      // Fetch existing messages
      const historyRows = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.sessionId, sid))
        .orderBy(chatMessages.createdAt);

      // Save user message to DB
      await db.insert(chatMessages).values({
        sessionId: sid,
        role: "user",
        content,
      });

      // Build messages array from history + new message
      messages = historyRows.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
      messages.push({ role: "user", content });

      // Update session title from first user message
      if (historyRows.length === 0) {
        const title =
          content.length > 30 ? content.slice(0, 30) + "..." : content;
        await db
          .update(chatSessions)
          .set({ title, updatedAt: new Date() })
          .where(eq(chatSessions.id, sid));
      } else {
        await db
          .update(chatSessions)
          .set({ updatedAt: new Date() })
          .where(eq(chatSessions.id, sid));
      }
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
7. 不要编造不存在的资产、负债或交易数据

## 可执行的操作

你可以通过以下格式执行数据操作，帮助用户管理财务：

【操作:action_name】
{json参数}

### 支持的操作：

1. **create_transaction** - 创建交易记录
   - 参数: type (交易类型), amount (金额), description (描述), transactionDate (日期, 可选), categoryId (分类ID, 可选), note (备注, 可选)
   - type 可选值: expense (支出), income (收入), asset_value_change (资产价值变动), asset_income (资产收益), liability_repayment (负债还款), liability_principal_change (负债本金变动), transfer (转账), reconciliation (对账调整)

2. **create_asset** - 创建资产
   - 参数: name (名称), type (类型), currentValue (当前价值), monthlyIncome (月收入, 可选), annualYield (年化收益率%, 可选)
   - type 可选值: real_estate (房产), deposit (存款), investment (投资), income_source (收入来源), other (其他)

3. **create_liability** - 创建负债
   - 参数: name (名称), type (类型), totalPrincipal (总额), annualRate (年利率%), monthlyPayment (月供), paymentDay (还款日, 可选)
   - type 可选值: mortgage (房贷), car_loan (车贷), credit_card (信用卡), personal_loan (个人贷款), other (其他)

4. **update_asset** - 更新资产
   - 参数: id (资产ID), currentValue (新价值, 可选), monthlyIncome (月收入, 可选), isActive (是否启用, 可选)

5. **update_liability** - 更新负债
   - 参数: id (负债ID), remainingPrincipal (剩余本金, 可选), isActive (是否结清, 可选)

### 使用示例：

【操作:create_transaction】
{"type": "expense", "amount": 500, "description": "午餐消费"}

一次回答中可以包含多个操作。操作执行结果会自动追加到回答末尾。`;

    const fullMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    // Call OpenAI-compatible API with timeout
    const endpoint = (baseUrl || "https://api.openai.com/v1").replace(
      /\/+$/,
      "",
    );
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let response;
    try {
      response = await fetch(`${endpoint}/chat/completions`, {
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
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      if ((fetchErr as Error).name === "AbortError") {
        console.error("AI API timeout:", endpoint);
        return NextResponse.json(
          {
            error: `AI 接口连接超时，请检查网络或更换 API 地址（当前地址: ${endpoint}）`,
          },
          { status: 502 },
        );
      }
      const cause = (fetchErr as { cause?: Error }).cause;
      if (
        cause?.message?.includes("ConnectTimeout") ||
        cause?.message?.includes("connect ETIMEDOUT")
      ) {
        return NextResponse.json(
          { error: "AI 接口连接超时，请检查网络或更换 API 地址" },
          { status: 502 },
        );
      }
      if (cause?.message?.includes("ENOTFOUND")) {
        return NextResponse.json(
          { error: "AI 接口域名解析失败，请检查 API 地址是否正确" },
          { status: 502 },
        );
      }
      if (cause?.message?.includes("ECONNREFUSED")) {
        return NextResponse.json(
          { error: "AI 接口连接被拒绝，请检查 API 地址和端口" },
          { status: 502 },
        );
      }
      throw fetchErr;
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      return NextResponse.json(
        { error: `AI 接口调用失败 (${response.status})` },
        { status: 502 },
      );
    }

    // Proxy the stream, accumulating text to detect and execute actions
    const reader = response.body?.getReader();
    if (!reader) {
      return NextResponse.json({ error: "无法读取 AI 响应" }, { status: 502 });
    }

    const decoder = new TextDecoder();
    let accumulated = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content || "";
                accumulated += delta;
              } catch {}
            }

            controller.enqueue(value);
          }

          // After streaming completes, parse and execute actions
          console.log(
            "[AI Chat] Full accumulated text:",
            accumulated.slice(0, 500),
          );
          const { actions, cleanText } = parseActions(accumulated);

          // Save assistant response to DB in session mode
          if (sid) {
            await db.insert(chatMessages).values({
              sessionId: sid,
              role: "assistant",
              content: cleanText || accumulated,
            });
            await db
              .update(chatSessions)
              .set({ updatedAt: new Date() })
              .where(eq(chatSessions.id, sid));
          }

          if (actions.length > 0) {
            console.log(
              `Executing ${actions.length} action(s) from AI response`,
            );
            const summaryParts: string[] = [];
            for (const action of actions) {
              const result = await executeAction(
                user.id,
                action.name,
                action.params,
              );
              if (result.success) {
                summaryParts.push(
                  `✅ ${result.message}\n📋 当前数据：${result.verifyData ?? "(无可验证数据)"}`,
                );
              } else {
                summaryParts.push(`❌ ${result.message}`);
              }
            }
            const summary = summaryParts.join("\n\n");
            // Append execution summary as a final data chunk
            const summaryPayload = `data: {"choices":[{"delta":{"content":"\n\n---\n## ✅ 操作执行结果\n\n${summary}"}}]}\n\ndata: [DONE]\n\n`;
            controller.enqueue(new TextEncoder().encode(summaryPayload));
          }

          controller.close();
        } catch (err) {
          console.error("Stream error:", err);
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
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
