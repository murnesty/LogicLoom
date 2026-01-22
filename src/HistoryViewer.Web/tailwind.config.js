/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dynasty colors from the design doc
        'qin': '#8B4513',
        'han': '#DC143C',
        'sui': '#4B0082',
        'tang': '#FFD700',
        'song': '#32CD32',
        'yuan': '#1E90FF',
        'ming': '#FF6347',
        'qing': '#9932CC',
        'warring-states': '#696969',
        'three-kingdoms': '#4682B4',
      },
    },
  },
  plugins: [],
}
