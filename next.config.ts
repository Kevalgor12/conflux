import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The editor and CRDT are client-only; keep server bundles lean.
  serverExternalPackages: ['ws', 'yjs']
}

export default nextConfig
