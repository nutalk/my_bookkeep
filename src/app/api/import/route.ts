import { NextResponse } from "next/server";
import { db } from "@/db";
import { assets, liabilities, transactions, categories } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

/**
 * OpenBookkeeping 数据导入接口
 *
 * 接收 export_data.py 导出的 JSON 格式，将数据导入到当前登录用户下。
 */

// p_type: 0=固定资产, 1=流动资产, 2=长期负债, 3=流动负债
// ctype: 0=固定现金流, 1=等额本息, 2=先息后本, 3=等额本金, 4=到期还本付息

const ASSET_TYPE_MAP: Record<number, string> = {
  0: "real_estate",
  1: "deposit",
};

const LIABILITY_TYPE_MAP: Record<number, string> = {
  2: "mortgage",
  3: "personal_loan",
};

const REPAYMENT_METHOD_MAP: Record<number, string> = {
  0: "fixed",
  1: "equal_installment",
  2: "interest_only",
  3: "equal_principal",
  4: "bullet",
};

interface DetailItem {
  id: number;
  occur_date: string;
  amount: number;
  comment: string;
}

interface PropItem {
  id: number;
  name: string;
  p_type: number;
  start_date: string;
  term_month: number;
  rate: number;
  currency: number;
  ctype: number | null;
  comment: string;
  activate: boolean;
  details: DetailItem[];
}

interface ImportPayload {
  version?: string;
  props: PropItem[];
}

function parseDate(dateStr: string): Date {
  // 支持 dd/mm/YYYY 和 YYYY-MM-DD 两种格式
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split("/");
    return new Date(`${y}-${m}-${d}`);
  }
  return new Date(dateStr);
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();

    // 检查用户是否已有数据
    const [existingAsset] = await db
      .select({ id: assets.id })
      .from(assets)
      .where(eq(assets.userId, user.id))
      .limit(1);
    const [existingLiability] = await db
      .select({ id: liabilities.id })
      .from(liabilities)
      .where(eq(liabilities.userId, user.id))
      .limit(1);

    if (existingAsset || existingLiability) {
      return NextResponse.json(
        {
          error: "当前用户已有数据，请先到「数据管理」页面清空数据后再导入。",
        },
        { status: 409 },
      );
    }

    const body: ImportPayload = await request.json();
    const { props = [] } = body;

    if (!props.length) {
      return NextResponse.json({ error: "导入数据为空" }, { status: 400 });
    }

    // 创建默认分类
    const defaultCategories = [
      { name: "房产", type: "asset" },
      { name: "存款", type: "asset" },
      { name: "投资", type: "asset" },
      { name: "收入来源", type: "asset" },
      { name: "房贷", type: "liability" },
      { name: "个人贷款", type: "liability" },
      { name: "信用卡", type: "liability" },
      { name: "其他资产", type: "asset" },
      { name: "其他负债", type: "liability" },
    ];

    const categoryMap = new Map<string, number>();
    for (const cat of defaultCategories) {
      const [existing] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(
            eq(categories.userId, user.id),
            eq(categories.name, cat.name),
            eq(categories.type, cat.type),
          ),
        )
        .limit(1);

      if (existing) {
        categoryMap.set(`${cat.type}:${cat.name}`, existing.id);
      } else {
        const result = await db.insert(categories).values({
          userId: user.id,
          name: cat.name,
          type: cat.type,
        });
        categoryMap.set(`${cat.type}:${cat.name}`, Number(result[0].insertId));
      }
    }

    const stats = {
      assetsCreated: 0,
      liabilitiesCreated: 0,
      transactionsCreated: 0,
      skipped: 0,
    };

    for (const prop of props) {
      const pType = prop.p_type;
      const isAsset = pType <= 1;

      if (isAsset) {
        // ---------- 导入资产 ----------
        const assetType = ASSET_TYPE_MAP[pType] || "other";
        const categoryName =
          assetType === "real_estate"
            ? "房产"
            : assetType === "deposit"
              ? "存款"
              : assetType === "investment"
                ? "投资"
                : "其他资产";
        const categoryKey = `asset:${categoryName}`;
        const categoryId = categoryMap.get(categoryKey) ?? null;

        // 资产当前值 = 所有 detail 的 amount 总和
        const currentValue = prop.details.reduce(
          (sum: number, d: DetailItem) => sum + d.amount,
          0,
        );

        const result = await db.insert(assets).values({
          userId: user.id,
          name: prop.name,
          type: assetType as
            | "real_estate"
            | "deposit"
            | "investment"
            | "income_source"
            | "other",
          categoryId,
          currentValue,
          monthlyIncome: prop.currency || 0,
          annualYield: prop.rate || 0,
          isActive: prop.activate,
          note: prop.comment || null,
        });

        const newAssetId = Number(result[0].insertId);
        stats.assetsCreated++;

        // 创建初始交易记录（第一条明细作为初始金额）
        if (prop.details.length > 0) {
          const firstDetail = prop.details[0];
          await db.insert(transactions).values({
            userId: user.id,
            type: "income",
            categoryId,
            assetId: newAssetId,
            amount: firstDetail.amount,
            description: `[导入] ${firstDetail.comment || "初始金额"}`,
            transactionDate: parseDate(firstDetail.occur_date),
            note: `从 OpenBookkeeping 导入，原 Prop ID: ${prop.id}`,
          });
          stats.transactionsCreated++;

          // 后续明细作为额外交易
          for (let i = 1; i < prop.details.length; i++) {
            const d = prop.details[i];
            const txType = d.amount >= 0 ? "income" : "expense";
            await db.insert(transactions).values({
              userId: user.id,
              type: txType,
              categoryId,
              assetId: newAssetId,
              amount: Math.abs(d.amount),
              description: `[导入] ${d.comment || "资产变动"}`,
              transactionDate: parseDate(d.occur_date),
              note: `从 OpenBookkeeping 导入`,
            });
            stats.transactionsCreated++;
          }
        }
      } else {
        // ---------- 导入负债 ----------
        const liabilityType = LIABILITY_TYPE_MAP[pType] || "personal_loan";
        const categoryName = liabilityType === "mortgage" ? "房贷" : "个人贷款";
        const categoryKey = `liability:${categoryName}`;
        const categoryId = categoryMap.get(categoryKey) ?? null;

        const repaymentMethod =
          REPAYMENT_METHOD_MAP[prop.ctype ?? 0] || "equal_installment";

        // 负债金额：第一条明细为初始本金，后续明细的负数为还款
        let totalPrincipal = 0;
        let remainingPrincipal = 0;
        let monthlyPayment = 0;
        let first = true;

        for (const d of prop.details) {
          if (first) {
            totalPrincipal = Math.abs(d.amount);
            remainingPrincipal = totalPrincipal;
            monthlyPayment = Math.abs(d.amount);
            first = false;
          } else if (d.amount < 0) {
            remainingPrincipal += d.amount; // 负数为还款，减少本金
          }
        }

        // 如果剩余本金为负，置为0
        remainingPrincipal = Math.max(0, remainingPrincipal);

        // 计算结束日期
        let endDate: Date | null = null;
        if (prop.term_month > 0) {
          const start = parseDate(prop.start_date);
          endDate = new Date(start);
          endDate.setMonth(endDate.getMonth() + prop.term_month);
        }

        const result = await db.insert(liabilities).values({
          userId: user.id,
          name: prop.name,
          type: liabilityType as
            | "mortgage"
            | "car_loan"
            | "credit_card"
            | "personal_loan"
            | "other",
          categoryId,
          totalPrincipal,
          remainingPrincipal,
          annualRate: prop.rate || 0,
          repaymentMethod: repaymentMethod as
            | "equal_installment"
            | "equal_principal"
            | "interest_only"
            | "bullet"
            | "minimum"
            | "fixed",
          monthlyPayment,
          paymentDay: null,
          startDate: parseDate(prop.start_date),
          endDate,
          isActive: prop.activate,
          note: prop.comment || null,
        });

        const newLiabilityId = Number(result[0].insertId);
        stats.liabilitiesCreated++;

        // 创建交易记录
        for (let i = 0; i < prop.details.length; i++) {
          const d = prop.details[i];
          if (i === 0) {
            // 第一条：初始借款
            await db.insert(transactions).values({
              userId: user.id,
              type: "liability_principal_change",
              categoryId,
              liabilityId: newLiabilityId,
              amount: Math.abs(d.amount),
              description: `[导入] ${d.comment || "初始借款"}`,
              transactionDate: parseDate(d.occur_date),
              note: `从 OpenBookkeeping 导入，原 Prop ID: ${prop.id}`,
            });
            stats.transactionsCreated++;
          } else if (d.amount < 0) {
            // 还款
            await db.insert(transactions).values({
              userId: user.id,
              type: "liability_repayment",
              categoryId,
              liabilityId: newLiabilityId,
              amount: Math.abs(d.amount),
              principalPart: Math.abs(d.amount),
              interestPart: 0,
              description: `[导入] ${d.comment || "还款"}`,
              transactionDate: parseDate(d.occur_date),
              note: `从 OpenBookkeeping 导入`,
            });
            stats.transactionsCreated++;
          } else {
            // 其他正向变动（追加借款等）
            await db.insert(transactions).values({
              userId: user.id,
              type: "liability_principal_change",
              categoryId,
              liabilityId: newLiabilityId,
              amount: d.amount,
              description: `[导入] ${d.comment || "负债变动"}`,
              transactionDate: parseDate(d.occur_date),
              note: `从 OpenBookkeeping 导入`,
            });
            stats.transactionsCreated++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `导入完成！共导入 ${stats.assetsCreated} 个资产、${stats.liabilitiesCreated} 个负债、${stats.transactionsCreated} 条交易记录。`,
      stats,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("Import error:", e);
    return NextResponse.json(
      { error: "导入失败: " + ((e as Error).message || "未知错误") },
      { status: 500 },
    );
  }
}
