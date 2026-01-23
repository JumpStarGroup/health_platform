const fs = require('fs');
const path = require('path');
const pptxgen = require('pptxgenjs');

// Use the repo-local skill implementation (this workspace uses .github/skills)
const html2pptx = require(path.resolve(__dirname, '..', '.github', 'skills', 'pptx', 'scripts', 'html2pptx.js'));

const REPORT_DATE = '2026-01-23';
const VERSION = '1.1.0';

const slides = [
  'slide01-cover.html',
  'slide02-changes.html',
  'slide03-changes-list.html',
  'slide04-feature-catalog-user.html',
  'slide05-feature-catalog-admin.html',
  'slide06-import-flow.html',
  'slide07-quality-fixed.html',
  'slide08-roadmap.html'
];

async function build() {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'Health Platform Team';
  pptx.title = `Health Platform Feature Report (${REPORT_DATE})`;
  pptx.subject = `Full feature catalog + recent changes (v${VERSION})`;

  for (const file of slides) {
    const htmlPath = path.join(__dirname, 'slides_feature_report', REPORT_DATE, file);
    await html2pptx(htmlPath, pptx);
  }

  const outDirReports = path.resolve(__dirname, '..', 'docs', 'reports');
  const outDirReportCompat = path.resolve(__dirname, '..', 'docs', 'report');
  const outName = `health_platform_full_feature_report_${REPORT_DATE}_v${VERSION}.pptx`;

  const outPrimary = path.join(outDirReports, outName);
  await pptx.writeFile({ fileName: outPrimary });

  // Compatibility output to docs/report/
  try {
    fs.mkdirSync(outDirReportCompat, { recursive: true });
    const outCompat = path.join(outDirReportCompat, outName);
    fs.copyFileSync(outPrimary, outCompat);
  } catch (e) {
    // non-fatal
  }
}

build().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
