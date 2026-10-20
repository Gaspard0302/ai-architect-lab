import { existsSync, lstatSync, readFileSync, readdirSync, readlinkSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const problems = []
for (const alias of ['.claude/skills', '.agents/skills']) {
  if (!existsSync(alias) || !lstatSync(alias).isSymbolicLink() || readlinkSync(alias) !== '../skills') {
    problems.push(`${alias} must link to ../skills`)
  }
}
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean)
for (const path of tracked) {
  if (/(^|\/)(node_modules|\.next|\.vercel|\.kilo|dist)(\/|$)/.test(path)
      || /(^|\/)\.env(?!\.example$)/.test(path)
      || path.endsWith('.tsbuildinfo')
      || /courses\/[^/]+\/(data\/|ratings\.yaml$)/.test(path)
      || /^(courses\/(architect|developer)\/|\.local\/)/.test(path)) {
    problems.push(`Local state must not be tracked: ${path}`)
  }
}
const canonical = readdirSync('skills', { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(`skills/${entry.name}/SKILL.md`))
for (const course of readdirSync('courses')) {
  if (existsSync(`courses/${course}/architect-skills`)) problems.push(`Duplicate skill tree under ${course}`)
}
if (existsSync('.git/config')) {
  const config = readFileSync('.git/config', 'utf8')
  const remotes = [...config.matchAll(/^\s*url\s*=\s*(.+)$/gm)].map((match) => match[1])
  for (const remote of remotes) {
    if (!/^https:\/\/github\.com\/Gaspard0302\/ai-architect-lab(?:\.git)?\s*$/.test(remote)) {
      problems.push('Unexpected remote; update this personal-repository check if the repo is deliberately renamed')
    }
  }
}
if (problems.length) {
  console.error(problems.join('\n'))
  process.exitCode = 1
} else console.log(`Foundation clean; ${canonical.length} canonical skills; local state excluded from tracked files`)
