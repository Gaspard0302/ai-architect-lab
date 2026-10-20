import type { NextConfig } from 'next'

const config: NextConfig = {
  // courses/ is read from disk at request time; keep it out of the bundler's way.
  outputFileTracingIncludes: { '/**': ['./courses/**'] },
}

export default config
