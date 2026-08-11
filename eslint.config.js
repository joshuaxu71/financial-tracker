const expoConfig = require("eslint-config-expo/flat");
const unusedImports = require("eslint-plugin-unused-imports");

module.exports = [
   ...expoConfig,
   {
      plugins: {
         "unused-imports": unusedImports,
      },
      rules: {
         "react-hooks/set-state-in-effect": "warn",
         "no-unused-vars": "off",
         "@typescript-eslint/no-unused-vars": "off",
         "unused-imports/no-unused-imports": "error",
         "unused-imports/no-unused-vars": [
            "warn",
            {
               vars: "all",
               varsIgnorePattern: "^_",
               args: "after-used",
               argsIgnorePattern: "^_",
            },
         ],
      },
   },
   {
      files: ["scripts/**/*.js"],
      languageOptions: {
         globals: {
            __dirname: "readonly",
            require: "readonly",
            module: "readonly",
            process: "readonly",
         },
      },
   },
];
