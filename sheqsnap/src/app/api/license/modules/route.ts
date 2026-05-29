import { NextResponse } from 'next/server'
import { getLicenseModules } from '@/lib/license'

export const dynamic = 'force-dynamic'

export async function GET() {
  const license = await getLicenseModules()
  return NextResponse.json({
    status: license.status,
    modules: license.modules,
  })
}
