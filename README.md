# vite-http2-proxy

An easy to use plugin to solve the problem that vite does not support http2Proxy.

# Feature

- Ease of use: no need to modify & compatible with `viteConfig.server.proxy` configuration, no need to learn new configuration
- Simple: https certificate will be injected into the machine with `devcert` with one click, no additional operations
- Popular: Support for the latest `vite >=5`

# How to use

```js
// vite.config.js
import { resolve } from 'path'
import { defineConfig } from 'vite'
import http2Proxy from 'vite-http2-proxy'

export default defineConfig((env) => ({
    plugins: [
        http2Proxy(),
    ],
    server: {
        port: 5255,
        open: true,
        proxy: {
            [env.localServerUrl]: {
                // target: `http://172.20.221.146:8080`,
                target: `http:${env.serverUrl}`,
                changeOrigin: true,
                rewrite: (path) => path.replace(new RegExp(`^${env.localServerUrl}`), ''),
                cookieDomainRewrite: env.rootCookieDomain,
                headers: { Cookie: `my-token=${env.localToken}` },
            },
        },
    },
}))

```

