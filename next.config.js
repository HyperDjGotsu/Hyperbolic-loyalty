/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['img.clerk.com', 'images.clerk.dev', 'en.onepiece-cardgame.com'],
  },
  async headers() {
    return [
      {
        // Prevent the invitation token in the URL from leaking via Referer
        source: '/staff/accept-invite',
        headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }],
      },
    ];
  },
};

module.exports = nextConfig;
