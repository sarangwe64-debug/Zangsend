/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--bg-base)',
        surface: 'var(--bg-surface)',
        elevated: 'var(--bg-elevated)',
        border: {
          DEFAULT: 'var(--bg-border)',
          soft: 'var(--bg-border-soft)'
        },
        primary: {
          DEFAULT: 'var(--green-primary)',
          dim: 'var(--green-dim)',
          ghost: 'var(--green-ghost)',
          glow: 'var(--green-glow)',
          muted: 'var(--green-muted)',
          text: 'var(--green-text)'
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          accent: 'var(--text-accent)'
        },
        status: {
          sent: 'var(--status-sent)',
          opened: 'var(--status-opened)',
          replied: 'var(--status-replied)',
          bounced: 'var(--status-bounced)',
          pending: 'var(--status-pending)',
          finding: 'var(--status-finding)'
        }
      },
      fontFamily: {
        sans: ['Geist Sans', 'Instrument Sans', 'sans-serif'],
        mono: ['Geist Mono', 'DM Mono', 'monospace'],
        display: ['Geist', 'DM Mono', 'sans-serif']
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '10px',
        xl: '16px'
      }
    },
  },
  plugins: [],
}
