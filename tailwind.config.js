/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        whatsapp: {
          teal: '#008069',
          'teal-dark': '#00a884',
          light: '#25D366',
          blue: '#34B7F1',
          dark: '#111b21',
          'gray-dark': '#202c33',
          'gray-light': '#8696a0',
          background: '#f0f2f5', // App background
          chat: '#efeae2',       // Chat area background
          incoming: '#ffffff',
          outgoing: '#d9fdd3',
        }
      }
    },
  },
  plugins: [],
}

