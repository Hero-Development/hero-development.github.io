const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  purge: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  darkMode: "class", // or 'media' or 'class'
  mode: "jit",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Share Tech Mono", ...defaultTheme.fontFamily.sans],
      },
    },
  },
  variants: {
    extend: {},
    scrollbar: ["dark", "rounded"],
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("tailwind-scrollbar-hide"),
    require("tailwind-scrollbar"),
  ],
};
