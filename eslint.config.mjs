import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".open-next/**",
      "worker-configuration.d.ts",
      "src/db/migrations/**",
    ],
  },
];

export default eslintConfig;
