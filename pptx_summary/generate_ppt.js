const path = require('path');
const pptxgen = require('pptxgenjs');
const html2pptx = require(path.resolve(__dirname, '..', '.claude', 'skills', 'pptx', 'scripts', 'html2pptx.js'));

const slides = [
  'slide01-title.html',
  'slide02-overview.html',
  'slide03-mvp.html',
  'slide04-members.html',
  'slide05-batch-import.html',
  'slide06-thresholds.html',
  'slide07-quality.html',
  'slide08-stability.html',
  'slide09-roadmap.html'
];

async function build() {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'Health Platform Team';
  pptx.title = '健康记录平台功能实现总结';

  for (const file of slides) {
    const htmlPath = path.join(__dirname, 'slides', file);
    await html2pptx(htmlPath, pptx);
  }

  const output = path.join(__dirname, 'health_platform_summary_blue.pptx');
  await pptx.writeFile({ fileName: output });
}

build().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
