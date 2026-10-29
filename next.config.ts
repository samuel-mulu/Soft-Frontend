import type { NextConfig } from 'next';

/** Dev (`next dev`) and prod (`next build` / `next start`) must not share output — see Next.js #35783-style chunk races. */
function resolveDistDir(): string {
  if (process.env.NEXT_DIST_DIR) {
    return process.env.NEXT_DIST_DIR;
  }
  const lifecycle = process.env.npm_lifecycle_event;
  const devLifecycle =
    lifecycle === 'dev' ||
    lifecycle === 'dev:clean' ||
    lifecycle === 'dev:turbo';
  const devArgv = process.argv.some((arg) => arg === 'dev');
  return devLifecycle || devArgv ? '.next-dev' : '.next';
}

const nextConfig: NextConfig = {
  distDir: resolveDistDir(),
  webpack(config, { dev, isServer, nextRuntime }) {
    // In dev, Next splits node_modules into `.next/server/vendor-chunks/*`. During HMR the
    // static-paths worker can require `page.js` while those files are being replaced (Windows
    // is especially prone). Bundling server vendor code with the page avoids dangling requires.
    if (dev && isServer && nextRuntime === 'nodejs') {
      const splitChunks = config.optimization?.splitChunks;
      if (
        splitChunks &&
        typeof splitChunks === 'object' &&
        splitChunks.cacheGroups &&
        typeof splitChunks.cacheGroups === 'object'
      ) {
        config.optimization = {
          ...config.optimization,
          splitChunks: {
            ...splitChunks,
            cacheGroups: {
              ...splitChunks.cacheGroups,
              vendor: false,
            },
          },
        };
      }
    }
    return config;
  },
};

export default nextConfig;
