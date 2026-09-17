/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  headers: async () => [
    { source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
  ],
};
export default nextConfig;
