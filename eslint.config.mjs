import globals from "globals";
import pluginJs from "@eslint/js";

export default [
  // 1. Tell ESLint we are writing generic browser/node code
  {
    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.node,
            // 2. Add Google Apps Script specific globals so it doesn't yell at us
            SpreadsheetApp: "readonly",
            Logger: "readonly",
            Utilities: "readonly",
            ContentService: "readonly"
        }
    }
  },
  // 3. Use the recommended "Best Practices" rule set
  pluginJs.configs.recommended,

  // 4. Our custom overrides (The "Mentorship" logic)
  {
      rules: {
          "no-unused-vars": "warn", // Don't break the build, just warn me
          "no-undef": "error",      // If I use a variable I didn't define, stop me!
      }
  }
];