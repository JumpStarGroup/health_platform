const path = require('path');
const pptxgen = require('pptxgenjs');
const html2pptx = require(path.resolve(__dirname, '..', '.claude', 'skills', 'pptx', 'scripts', 'html2pptx.js'));

const slides = [
  'slide01-cover.html',
  'slide02-overview.html',
  'slide03-highlights.html',
  'slide04-cicd.html',
  'slide05-testing.html',
  'slide06-docs.html',
  'slide07-wip.html',
  'slide08-next.html'
];

async function build() {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'Health Platform Team';
  pptx.title = '健康记录平台周报 (2026-01-22)';
  pptx.subject = 'Weekly Engineering Update';

  for (const file of slides) {
    const htmlPath = path.join(__dirname, 'slides_weekly', '2026-01-22', file);
    await html2pptx(htmlPath, pptx);
  }

  const output = path.resolve(__dirname, '..', 'docs', 'reports', 'weekly_report_2026-01-22.pptx');
  await pptx.writeFile({ fileName: output });
}

build().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
