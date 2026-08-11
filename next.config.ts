import type { NextConfig } from "next";

/**
 * 默认不启用 standalone 输出（适配 Vercel 等 Serverless 平台）。
 * Docker 部署时通过 NEXT_OUTPUT=standalone 开启 standalone 构建。
 */
const nextConfig: NextConfig = {
  ...(process.env.NEXT_OUTPUT === "standalone"
    ? { output: "standalone" as const }
    : {}),
};

export default nextConfig;
