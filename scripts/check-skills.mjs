import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parse } from 'yaml'

const problems = []
let count = 0
for (const directory of readdirSync('skills', { withFileTypes: true })) {
  if (!directory.isDirectory()) continue
  const root = join('skills', directory.name)
  const path = join(root, 'SKILL.md')
  if (!existsSync(path)) { problems.push(`${root}: missing SKILL.md`); continue }
  count++
  const text = readFileSync(path, 'utf8')
  const header = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text)
  try {
    if (!header) throw new Error('missing YAML frontmatter')
    const data = parse(header[1])
    if (data.name !== directory.name || !/^[a-z0-9-]{1,64}$/.test(data.name)) throw new Error('invalid or mismatched skill name')
    if (typeof data.description !== 'string' || !data.description.trim()) throw new Error('missing description')
  } catch (error) { problems.push(`${path}: ${error.message}`) }
  for (const match of text.matchAll(/`(reference\/[a-z0-9-]+\.md)`/g)) {
    if (!existsSync(resolve(root, match[1]))) problems.push(`${path}: missing ${match[1]}`)
  }
}
if (problems.length) { console.error(problems.join('\n')); process.exitCode = 1 }
else console.log(`${count} canonical skill entrypoints and their named references are valid`)
