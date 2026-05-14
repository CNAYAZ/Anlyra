import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // react-grid-layout ships CJS-only which causes webpack 5 to hang analyzing
  // the module graph when the package is pulled through dynamic imports.
  // transpilePackages forces webpack to treat them as transpilable sources.
  transpilePackages: ['react-grid-layout', 'react-resizable'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default withNextIntl(nextConfig);
