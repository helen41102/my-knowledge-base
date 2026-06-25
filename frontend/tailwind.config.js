/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EBF0FF',
          100: '#D6E0FF',
          500: '#2D5BE3',
          600: '#2048C8',
          700: '#1638A8',
        },
        accent: '#F05A28',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'PingFang SC', 'Helvetica Neue', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
