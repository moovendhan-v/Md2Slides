/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  ...(process.env.TAURI_BUILD === 'true' ? { output: 'export', distDir: 'out' } : {}),
}

export default nextConfig
