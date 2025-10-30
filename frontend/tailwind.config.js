/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        jambo: {
          "primary": "#2E62A3", // Deep blue (headings, links)
          "secondary": "#B5CCE8", // Light blue (charts, accents)
          "accent": "#C7DBF2", // Active sidebar item
          "neutral": "#1E1E1E", // Text color
          "base-100": "#FFFFFF", // Main background
          "base-200": "#F5F8FC", // Card background
          "base-300": "#EAF0F8", // Sidebar background
          "info": "#2E62A3", // For info or links
          "success": "#4CAF50", // Green success
          "warning": "#FBC02D", // Yellow warning
          "error": "#E53935", // Red error
        },
      },
    ],
    darkTheme: false, // Disable dark mode entirely
  },
}