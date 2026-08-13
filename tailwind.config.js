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
          50: '#f2fbf9',
          100: '#e6f7f3',
          200: '#bfebe2',
          300: '#99dfd0',
          400: '#4dc7ad',
          500: '#00af87', // Teal green accent from the design
          600: '#009e7a',
          700: '#007a5e',
          800: '#005f49',
          900: '#004e3c',
        },
        orangeAccent: {
          50: '#fffcf5',
          100: '#fff8eb',
          200: '#ffebcc',
          300: '#ffdead',
          400: '#ffc170',
          500: '#ff9f29', // Orange accent color from the design
          600: '#f58d13',
          700: '#cc6e00',
        }
      },
      boxShadow: {
        'premium': '0 10px 30px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        'premium-lg': '0 20px 40px -10px rgba(0, 0, 0, 0.08), 0 10px 15px -8px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}
