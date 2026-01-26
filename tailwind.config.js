/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'lume-primary': '#0F172A',
        'lume-secondary': '#334155', 
        'lume-accent': '#10B981',
      }
    },
  },
  plugins: [],
}
