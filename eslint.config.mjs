import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) })

export default [
  { ignores: ['.next/**', '.claude/worktrees/**', 'node_modules/**', 'scripts/**', 'next-env.d.ts', 'eslint.config.mjs'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
]
