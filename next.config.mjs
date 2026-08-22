/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sql.js'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('sql.js');
    }
    return config;
  },
};

export default nextConfig;
