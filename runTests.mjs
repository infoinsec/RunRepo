import getPackageJsonPropFromGithubRepo from './getPackageJsonPropFromGithubRepo.mjs'

console.log(await getPackageJsonPropFromGithubRepo('H2testjs', 'author'))