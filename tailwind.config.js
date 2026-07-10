export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ["Instrument Serif", "Noto Serif SC", "serif"],
        body: ["Barlow", "Noto Sans SC", "sans-serif"],
        display: ["Zhi Mang Xing", "Ma Shan Zheng", "Noto Serif SC", "serif"],
        cnserif: ["Noto Serif SC", "Songti SC", "serif"]
      },
      borderRadius: {
        DEFAULT: "9999px"
      },
      colors: {
        archiveGold: "#D8B46A"
      }
    }
  },
  plugins: []
};
