/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        // Prevent Cloudflare from caching HTML pages - only cache static assets with content hashes
        source: '/((?!_next/static|_next/image|icons|manifest.json|sw.js).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
