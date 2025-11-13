/** @type {import('next').NextConfig} */
const nextConfig = {
  api: {
    bodyParser: false,
    matcher: "/api/:path*",
  },
};

export default nextConfig;
