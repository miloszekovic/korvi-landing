/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/**/*.{html,js}"],
  theme: {
    extend: {
      maxWidth: {
        "8xl": "90rem",
        "9xl": "100rem",
        "10xl": "112rem",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        display: ["Space Grotesk", "ui-sans-serif", "system-ui"],
      },
      colors: {
        ink: "#0A0A0D",
        panel: "#101117",
        line: "#1D2230",
        muted: "#A1A8B8",
        soft: "#D8DEEA",
        brandBlue: "#51C2F5",
        brandPurple: "#6F35E7",
        brandMid: "#607BEE",
        korvi: {
          blue: "#1E7BFF",
          purple: "#7C3AED",
        },
      },
      boxShadow: {
        glow: "0 0 80px rgba(81,194,245,.16)",
        glow2: "0 0 120px rgba(111,53,231,.16)",
      },
      backgroundImage: {
        brand: "linear-gradient(135deg, #51C2F5 0%, #6F35E7 100%)",
        brandSoft:
          "linear-gradient(135deg, rgba(81,194,245,.12) 0%, rgba(111,53,231,.12) 100%)",
      },
    },
  },
  plugins: [],
};

