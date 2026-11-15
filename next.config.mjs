/** @type {import('next').NextConfig} */
const nextConfig = {
  // Carpeta de compilación aparte para las pruebas E2E (NEXT_DIST_DIR=.next-e2e):
  // así no se pisa el .next de un `npm run dev` abierto. Render usa el .next normal.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  experimental: {
    // Nota de venta (fase 7): pdfkit lee sus fuentes de su propia carpeta; se carga desde
    // node_modules en vez de empaquetarlo, o no las encuentra
    serverComponentsExternalPackages: ['pdfkit'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        ],
      },
    ];
  },
};

export default nextConfig;
