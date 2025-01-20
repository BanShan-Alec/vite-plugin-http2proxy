import type { Connect, Plugin, UserConfig } from "vite";
import http2Proxy from "http2-proxy";
import devcert from "devcert";

type TProxy = Required<UserConfig>["server"]["proxy"];

const error = (message: string): never => {
  throw new Error(message);
};

export default (): Plugin => {
  let proxyConfig: TProxy;
  return {
    name: "vite-http2-proxy",
    config: async (config, env) => {
      // https://cn.vitejs.dev/guide/api-javascript.html#resolveconfig
      if (env.command !== "serve") {
        return;
      }
      try {
        proxyConfig = config.server?.proxy;
        const ssl = await devcert.certificateFor(["localhost"]);
        return {
          server: {
            https: {
              key: ssl.key,
              cert: ssl.cert,
            },
            proxy: undefined,
          },
        };
      } catch (err) {
        console.error("[vite-http2-proxy]: error", err);
      }
    },
    // https://cn.vitejs.dev/guide/api-plugin#vite-specific-hooks
    configureServer: ({ middlewares }: { middlewares: Connect.Server }) => {
      if (!proxyConfig) {
        console.info("[vite-http2-proxy]: No proxy configuration found.");
        return;
      }
      for (const [key, value] of Object.entries(proxyConfig)) {
        const option = typeof value === "string" ? { target: value } : value;
        // TODO changeOrigin, cookieDomainRewrite is not supported yet
        const {
          target,
          rewrite,
          headers,
          secure = true,
          changeOrigin,
          cookieDomainRewrite,
        } = option;
        const re = new RegExp(key);
        const tu =
          typeof target === "string"
            ? new URL(target)
            : error(`Invalid target: ${key}`);

        if (!tu.pathname.endsWith("/")) {
          tu.pathname += "/";
        }

        const protocol = /^https?:$/.test(tu.protocol)
          ? (tu.protocol.slice(0, -1) as "https" | "http")
          : error(`Invalid protocol: ${tu.href}`);

        const port =
          tu.port === ""
            ? { https: 443, http: 80 }[protocol]
            : /^\d+$/.test(tu.port)
            ? Number(tu.port)
            : error(`Invalid port: ${tu.href}`);

        middlewares.use((req, res, next) => {
          req;
          if (req.url && re.test(req.url)) {
            const url = (rewrite?.(req.url) ?? req.url).replace(/^\/+/, "");
            const { pathname, search } = new URL(url, tu);
            http2Proxy.web(
              req,
              res,
              {
                protocol,
                port,
                hostname: tu.hostname,
                path: pathname + search,
                onReq: async (_, options) => {
                  options.headers = {
                    ...options.headers,
                    ...headers,
                  };
                },
                ["rejectUnauthorized" as never]: secure,
              },
              (err) => err && next(err)
            );
          } else {
            next();
          }
        });
      }
    },
  };
};
