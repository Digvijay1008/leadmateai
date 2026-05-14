import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class",
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'var(--background)',
  			foreground: 'var(--foreground)',
  			primary: {
  				DEFAULT: '#4F46E5',
  				foreground: '#FFFFFF'
  			},
  			secondary: {
  				DEFAULT: '#10B981',
  				foreground: '#FFFFFF'
  			},
  			surface: {
  				dark: '#0f172a'
  			},
  			accent: {
  				indigo: '#6366F1',
  				emerald: '#34D399',
  				foreground: '#FFFFFF'
  			},
  			border: 'var(--border)',
            input: 'var(--input)',
            ring: 'var(--ring)',
            muted: {
                DEFAULT: 'hsl(var(--muted))',
                foreground: 'hsl(var(--muted-foreground))'
            },
            popover: {
                DEFAULT: 'hsl(var(--popover))',
                foreground: 'hsl(var(--popover-foreground))'
            },
            card: {
                DEFAULT: 'hsl(var(--card))',
                foreground: 'hsl(var(--card-foreground))'
            }
  		},
  		fontFamily: {
  			headline: [
  				'Manrope',
  				'sans-serif'
  			],
  			body: [
  				'Inter',
  				'sans-serif'
  			]
  		},
  		borderRadius: {
  			'2xl': '1.25rem',
  			'3xl': '2.5rem',
            lg: 'var(--radius)',
            md: 'calc(var(--radius) - 2px)',
            sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
