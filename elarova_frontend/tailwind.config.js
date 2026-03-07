/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f0ff',
          100: '#e0e0ff',
          200: '#c0c0ff',
          300: '#9090ff',
          400: '#6060ff',
          500: '#667eea',
          600: '#5568d3',
          700: '#4650a8',
          800: '#374082',
          900: '#293363',
        },
        secondary: {
          500: '#764ba2',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
