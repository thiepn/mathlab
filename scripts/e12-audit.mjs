import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root=process.cwd();
const failures=[];
const pass=(condition,message)=>{if(!condition)failures.push(message);};
const text=(path)=>readFileSync(join(root,path),'utf8');
const required=[
  'src/app/e12Certification.ts',
  'src/app/completenessAudit.ts',
  'tests/e12GoldenCorpus.test.ts',
  'tests/e12Integration.test.ts',
  'tests/completenessAudit.test.ts',
  'docs/E12_ACCEPTANCE.md',
  'docs/E12_MATHEMATICAL_REAUDIT.md',
  'docs/RELEASE_CERTIFICATION.md',
  'docs/SECURITY_REVIEW.md',
];
for(const file of required)pass(existsSync(join(root,file)),`missing E12 certification artifact: ${file}`);

const pkg=JSON.parse(text('package.json'));
pass(pkg.version==='2.0.0','E12 package identity must be stable 2.0.0');
pass(pkg.scripts?.['audit:e12']==='node scripts/e12-audit.mjs','package must expose audit:e12');

if(existsSync(join(root,'src/app/e12Certification.ts'))){
  const certification=text('src/app/e12Certification.ts');
  pass(certification.includes("E12_TARGET_VERSION = '2.0.0'"),'E12 target version drifted');
  pass(certification.includes('E12_CERTIFICATION_DOMAINS = 22'),'E12 fixed rubric must remain 22 domains');
  for(const gate of ['golden-cross-domain-corpus','catalog-and-capability-consistency','exactness-provenance','pwa-static-contract','chromium-firefox-webkit-smoke','android-ios-engine-emulation'])pass(certification.includes(gate),`E12 automated gate missing: ${gate}`);
  for(const gate of ['physical Android Chrome spot check','physical iOS Safari spot check'])pass(certification.includes(gate),`E12 post-release physical validation target missing: ${gate}`);
}

if(existsSync(join(root,'src/app/completenessAudit.ts'))){
  const audit=text('src/app/completenessAudit.ts');
  const domainEntries=(audit.match(/id: '/g)??[]).length;
  pass(domainEntries===22,`completeness registry must contain exactly 22 domain entries; found ${domainEntries}`);
  pass(!audit.includes("status: 'missing'"),'E12 current registry must not contain a missing domain after E1-E11');
  pass(!audit.includes("status: 'comprehensive'"),'E12 must not overclaim any 5/5 comprehensive domain');
}

if(existsSync(join(root,'docs/E12_MATHEMATICAL_REAUDIT.md'))){
  const reaudit=text('docs/E12_MATHEMATICAL_REAUDIT.md');
  pass(reaudit.includes('66/100'),'E12 mathematical re-audit must record the fixed-rubric 66/100 breadth score');
  pass(reaudit.includes('0 comprehensive'),'E12 re-audit must explicitly record zero comprehensive domains');
}
if(existsSync(join(root,'docs/RELEASE_CERTIFICATION.md'))){
  const release=text('docs/RELEASE_CERTIFICATION.md');
  pass(release.includes('v2.0.0'),'release certification must identify stable v2.0.0');
  pass(release.includes('STABLE RELEASE GATE')||release.includes('stable release gate'),'release certification must record the stable release gate');
  pass(release.includes('physical-device')||release.includes('physical device'),'release certification must distinguish physical-device validation from CI evidence');
}

const ci=text('.github/workflows/ci.yml');
const deploy=text('.github/workflows/deploy.yml');
pass(ci.includes('npm run audit:e12'),'CI must run the E12 certification audit');
pass(deploy.includes('npm run audit:e12'),'Pages deployment must run the E12 certification audit');
pass(deploy.includes('npm run audit:stable'),'Pages deployment must run the stable release audit');

if(failures.length){
  console.error(`E12 certification audit failed (${failures.length} issue${failures.length===1?'':'s'}):`);
  for(const failure of failures)console.error(`- ${failure}`);
  process.exit(1);
}
console.log('MathLab E12 certification audit: PASS');
