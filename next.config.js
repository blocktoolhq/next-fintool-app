/** @type {import('next').NextConfig} */
const nextConfig = {
  // Improve webpack caching and error handling
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Improve cache handling in development
      config.cache = {
        type: 'filesystem',
        compression: false, // Disable compression to avoid ENOENT errors
      };
    }
    return config;
  },
  
  // Handle edge runtime issues
  experimental: {
    serverComponentsExternalPackages: [],
  },
  
  // Improve error handling for API routes
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
};

module.exports = nextConfig;
