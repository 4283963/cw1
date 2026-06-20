/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ev-primary': '#0ea5e9',
        'ev-secondary': '#0284c7',
        'ev-accent': '#38bdf8',
        'ev-dark': '#0f172a',
        'ev-card': '#1e293b',
      },
    },
  },
  plugins: [],
}
