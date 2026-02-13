import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use CI_PAGES_URL for GitLab Pages deployments (includes path prefix for branch previews)
  // Falls back to './' for local dev and other environments
  base: process.env.CI_PAGES_URL || './',
  server: {
    port: 5050, // Match the original port
    proxy: {
      '/proxy': {
        target: 'https://gitlab.com/api/v4',
        changeOrigin: true,
        secure: true,
        cookieDomainRewrite: 'localhost',
        rewrite: (path) => path.replace(/^\/proxy/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // GitLab API requires the token in the "PRIVATE-TOKEN" header (uppercase)
            // Check for all possible case variations
            const tokenValue = 
              req.headers['private-token'] || 
              req.headers['PRIVATE-TOKEN'] || 
              req.headers['Private-Token'];
            
            if (tokenValue) {
              // Always set as uppercase for GitLab API
              proxyReq.setHeader('PRIVATE-TOKEN', tokenValue);
              console.log('Added PRIVATE-TOKEN header to proxy request', {
                tokenLength: typeof tokenValue === 'string' ? tokenValue.length : 'not a string',
                firstChars: typeof tokenValue === 'string' ? `${tokenValue.substring(0, 4)}...` : ''
              });
            } else {
              console.warn('No Private-Token header found in the request');
            }
            
            // Log request info for debugging
            console.log('Proxy request: ', {
              url: req.url,
              method: req.method,
              headers: Object.keys(req.headers)
            });
          });
          
          // Handle cookies properly
          proxy.on('proxyRes', (proxyRes) => {
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