import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Ensures assets are loaded correctly when deployed to GitHub Pages
  server: {
    port: 5050, // Match the original port
    proxy: {
      '/proxy': {
        target: 'https://gitlab.com/api/v4',
        changeOrigin: true,
        secure: true,
        cookieDomainRewrite: 'localhost',
        rewrite: (path) => path.replace(/^\/proxy/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Forward the PRIVATE-TOKEN header to GitLab API
            if (req.headers['private-token']) {
              proxyReq.setHeader('PRIVATE-TOKEN', req.headers['private-token']);
            }
          });
          
          // Handle cookies properly
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // Remove or modify problematic cookies
            const setCookieHeaders = proxyRes.headers['set-cookie'];
            if (setCookieHeaders) {
              const filteredCookies = setCookieHeaders
                .filter(cookie => !cookie.includes('_cfuvid')) // Filter out Cloudflare cookies
                .map(cookie => cookie.replace(/Domain=[^;]+/, 'Domain=localhost')); // Rewrite domain
              
              if (filteredCookies.length > 0) {
                proxyRes.headers['set-cookie'] = filteredCookies;
              } else {
                delete proxyRes.headers['set-cookie'];
              }
            }
          });
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false, // Disable CSS processing in tests
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['.skipped_tests/**/*', 'node_modules/**/*'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/setup.ts',
      ]
    }
  }
})