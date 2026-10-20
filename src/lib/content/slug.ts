// GitHub heading slug.
//
// EXACT copy of the `slug` in scripts/validate-bank.js. The question banks' `sources`
// anchors are validated against that function, so any divergence here silently breaks
// every deep link. Do not "improve" it and do not swap in github-slugger.
export const slug = (t: string): string =>
  t
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s/g, '-')
