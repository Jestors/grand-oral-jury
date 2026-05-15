/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/:path*',
        destination: 'https://grand-oral-jury-france.vercel.app/:path*',
        permanent: true,
      },
    ]
  },
}
module.exports = nextConfig
