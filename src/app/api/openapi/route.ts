import { readFile } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'
import { manejarRuta } from '@/lib/api/respuestas'

export const dynamic = 'force-dynamic'

// GET /api/openapi — Público. Contrato que muestra /api-docs.
export const GET = manejarRuta(async () => {
  const contrato = await readFile(path.join(process.cwd(), 'docs', 'api', 'openapi.yaml'), 'utf8')

  return new NextResponse(contrato, {
    headers: { 'Content-Type': 'text/yaml; charset=utf-8' },
  })
})
