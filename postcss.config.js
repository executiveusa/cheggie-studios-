// PostCSS configuration for Tailwind CSS v4
// Tailwind v4 uses its own PostCSS plugin (@tailwindcss/postcss) instead of
// the old `tailwindcss` plugin. Autoprefixer is included for broad browser support.

/** @type {import('postcss').Config} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    autoprefixer: {},
  },
};

module.exports = config;
