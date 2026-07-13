export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ku: {
          navy: '#0E2D52',
          dark: '#0A2244',
          gold: '#C89B2A',
          goldlt: '#F5C842',
        },
        brand: {
          50:"#eef4ff",100:"#dbe6fe",200:"#bfd3fe",300:"#93b4fc",
          400:"#608bf8",500:"#3b66f0",600:"#2747e3",700:"#2138c4",
          800:"#1f309e",900:"#1f2d7e",950:"#161c4d"
        }
      },
      fontFamily: { sans: ["Inter","ui-sans-serif","system-ui","sans-serif"] },
      keyframes: {
        fadeIn: { "0%": { opacity:"0", transform:"translateY(-8px)" }, "100%": { opacity:"1", transform:"translateY(0)" } }
      },
      animation: { fadeIn: "fadeIn 0.2s ease-out" }
    }
  },
  plugins: []
};
