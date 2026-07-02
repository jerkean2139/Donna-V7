import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", "out/**", "build/**", "drizzle/**"],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  // Layering: app code goes app → service → repository → db. Pages, actions,
  // and components must never talk to the DB layer directly — only the
  // repository implementations and the central wiring module may.
  {
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/db/*", "**/db/client", "**/db/schema"],
              message:
                "App code must not import the DB layer directly. Go through @/lib services and the repositories wiring module.",
            },
            {
              group: ["drizzle-orm", "drizzle-orm/*", "postgres"],
              message:
                "Query building belongs in repository implementations under src/lib/**, not in app code.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
