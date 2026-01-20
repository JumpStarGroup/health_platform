const pptxgen = require('pptxgenjs');
const html2pptx = require('../.claude/skills/pptx/scripts/html2pptx.js');
const path = require('path');

async function createPresentation() {
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';
    pptx.author = 'Health Platform Team';
    pptx.title = '健康记录平台月度报告';
    pptx.subject = '月度功能报告 2026-01';
    
    const slides = [
        'slide01-cover.html',
        'slide02-summary.html',
        'slide03-versions.html',
        'slide04-features.html',
        'slide05-architecture.html',
        'slide06-performance.html',
        'slide07-testing.html',
        'slide08-roadmap.html',
        'slide09-thankyou.html'
    ];
    
    console.log('Creating presentation with', slides.length, 'slides...\n');
    
    for (let i = 0; i < slides.length; i++) {
        const htmlFile = path.join('workspace', slides[i]);
        console.log(`Processing slide ${i + 1}/${slides.length}: ${slides[i]}`);
        
        try {
            const { slide, placeholders } = await html2pptx(htmlFile, pptx);
            
            // Add charts for slides with placeholders
            if (placeholders.length > 0) {
                if (slides[i].includes('architecture')) {
                    // Architecture diagram - simple boxes
                    slide.addText('前端\nReact + Ant Design', {
                        ...placeholders[0],
                        y: placeholders[0].y,
                        h: 0.8,
                        fontSize: 11,
                        align: 'center',
                        valign: 'middle',
                        fill: { color: '4ECDC4' },
                        color: 'FFFFFF',
                        bold: true
                    });
                    slide.addText('后端\nFlask + SQLAlchemy', {
                        ...placeholders[0],
                        y: placeholders[0].y + 1,
                        h: 0.8,
                        fontSize: 11,
                        align: 'center',
                        valign: 'middle',
                        fill: { color: '1C5C8E' },
                        color: 'FFFFFF',
                        bold: true
                    });
                    slide.addText('数据库\nSQLite / MySQL', {
                        ...placeholders[0],
                        y: placeholders[0].y + 2,
                        h: 0.8,
                        fontSize: 11,
                        align: 'center',
                        valign: 'middle',
                        fill: { color: '2C3E50' },
                        color: 'FFFFFF',
                        bold: true
                    });
                } else if (slides[i].includes('performance')) {
                    // Performance bar chart
                    slide.addChart(pptx.charts.BAR, [{
                        name: '处理时间（秒）',
                        labels: ['100条', '500条', '1000条'],
                        values: [0.8, 3, 8]
                    }], {
                        ...placeholders[0],
                        barDir: 'bar',
                        showTitle: false,
                        showLegend: false,
                        showCatAxisTitle: false,
                        showValAxisTitle: true,
                        valAxisTitle: '时间（秒）',
                        valAxisMaxVal: 10,
                        valAxisMinVal: 0,
                        valAxisMajorUnit: 2,
                        chartColors: ['4ECDC4'],
                        dataLabelPosition: 'outEnd',
                        dataLabelColor: '2C3E50'
                    });
                } else if (slides[i].includes('testing')) {
                    // Testing pie chart
                    slide.addChart(pptx.charts.PIE, [{
                        name: '测试分布',
                        labels: ['单元测试', 'E2E测试'],
                        values: [37, 15]
                    }], {
                        ...placeholders[0],
                        showPercent: true,
                        showLegend: true,
                        legendPos: 'b',
                        chartColors: ['4ECDC4', 'FF6B6B']
                    });
                }
            }
            
            console.log(`  ✓ Slide ${i + 1} created`);
        } catch (error) {
            console.error(`  ✗ Error processing slide ${i + 1}:`, error.message);
            throw error;
        }
    }
    
    const outputFile = 'docs/reports/健康记录平台月度报告_2026-01.pptx';
    await pptx.writeFile({ fileName: outputFile });
    console.log('\n✓ Presentation saved:', outputFile);
}

createPresentation().catch(error => {
    console.error('Failed to create presentation:', error);
    process.exit(1);
});
