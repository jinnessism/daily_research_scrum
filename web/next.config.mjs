/** @type {import('next').NextConfig} */

// For GitHub Pages project sites the app is served from /<repo>.
// Set NEXT_PUBLIC_BASE_PATH at build time (the deploy workflow sets it).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  output: 'export',
  basePath,
  images: { unoptimized: true },
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
