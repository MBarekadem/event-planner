/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {

      /* ===== ANIMATIONS EXISTANTES ===== */
      animation: {
        scroll: "scroll 20s linear infinite",
        fadeUp: "fadeUp 0.6s ease",
      },

      keyframes: {
        scroll: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },

        /* ===== NOUVELLE ANIMATION CARD ===== */
        fadeUp: {
          "0%": {
            opacity: "0",
            transform: "translateY(30px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
      },

      /* ===== SHADOW PREMIUM (glass effect) ===== */
      boxShadow: {
        auth: "0 32px 80px rgba(37,99,235,0.12), 0 4px 16px rgba(30,64,175,0.08)",
      },

      /* ===== BORDER RADIUS MODERNE ===== */
      borderRadius: {
        auth: "28px",
      },

    },
  },

  plugins: [],
};