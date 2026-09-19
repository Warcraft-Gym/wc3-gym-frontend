import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Team, map and avatar images come from the backend and the Discord CDN, so they stay <img>.
  { rules: { "@next/next/no-img-element": "off" } },
  // A helper is framework-free. It reads a store through a `use*` accessor, which is a plain
  // function, not a React hook.
  { files: ["src/helpers/**"], rules: { "react-hooks/rules-of-hooks": "off" } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
