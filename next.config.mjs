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
    // Solo WebP: se probó AVIF y con estas fotos (tierra, pasto, texturas) pesa lo mismo
    // (1 155 KB contra 1 163 KB los 36 productos) y cuesta mucho más CPU generarlo en Render
    formats: ['image/webp'],
    // Anchos que se generan. 720 cubre la tarjeta en celular x2 sin pasar los 800 px de las fotos
    // de producto (si el ancho pedido es mayor que la foto, se manda el original sin achicar)
    deviceSizes: [360, 412, 640, 720, 828, 1080, 1280, 1920],
    imageSizes: [56, 96, 128, 256, 384],
    // Las versiones optimizadas se guardan 30 días en caché
    minimumCacheTTL: 2592000,
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
