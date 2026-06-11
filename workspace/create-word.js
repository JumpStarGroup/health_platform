const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
        HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType, 
        VerticalAlign, LevelFormat, PageBreak } = require('docx');

// Colors - 健康医疗蓝绿系
const COLORS = {
  primary: '1C5C8E',    // 深海蓝
  accent: '4ECDC4',     // 青绿
  highlight: 'FF6B6B',  // 珊瑚橙
  text: '2C3E50',       // 深灰
  lightGray: 'F7F9FA'   // 浅灰背景
};

const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };

const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 24 } } }, // 12pt
    paragraphStyles: [
      { id: 'Title', name: 'Title', basedOn: 'Normal',
        run: { size: 56, bold: true, color: COLORS.primary, font: 'Arial' },
        paragraph: { spacing: { before: 240, after: 240 }, alignment: AlignmentType.CENTER } },
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, color: COLORS.primary, font: 'Arial' },
        paragraph: { spacing: { before: 360, after: 240 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, color: COLORS.text, font: 'Arial' },
        paragraph: { spacing: { before: 240, after: 180 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, color: COLORS.text, font: 'Arial' },
        paragraph: { spacing: { before: 180, after: 120 }, outlineLevel: 2 } }
    ]
  },
  numbering: {
    config: [
      { reference: 'bullet-list',
        levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: 'numbered-list-1',
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }
    ]
  },
  sections: [{
    properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    children: [
      // Cover
      new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun('健康记录平台')] }),
      new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun('月度功能报告')] }),
      new Paragraph({ 
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 120 },
        children: [new TextRun({ text: '报告期间: 2025-12-19 ~ 2026-01-19', size: 24, color: COLORS.text })] 
      }),
      new Paragraph({ 
        alignment: AlignmentType.CENTER,
        spacing: { after: 360 },
        children: [new TextRun({ text: '当前版本: v1.1.0', size: 28, bold: true, color: COLORS.highlight })] 
      }),
      
      new PageBreak(),
      
      // 执行摘要
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('执行摘要')] }),
      new Paragraph({ 
        spacing: { after: 120 },
        children: [new TextRun('过去一个月，健康记录平台进行了重要的功能增强和稳定性改进。主要聚焦于E2E测试稳定性提升、批量数据导入能力和重复记录防护，为用户提供更加可靠和高效的健康数据管理体验。')] 
      }),
      
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('关键成果')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('E2E 测试通过率达到 100%，全流程稳定可重现')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('新增批量导入功能，支持 Excel/CSV 格式，单次可导入 1000 条记录')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('实现重复记录智能防护，避免数据冗余')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('完善三级权限管理体系（USER/ADMIN/SUPER_ADMIN）')] }),
      
      new PageBreak(),
      
      // 版本发布记录
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('版本发布记录')] }),
      
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('v1.1.0 (2026-01-15) - 测试稳定性提升')] }),
      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('改进内容')] }),
      new Paragraph({ numbering: { reference: 'numbered-list-1', level: 0 }, children: [new TextRun({ text: 'E2E 回归测试稳定性增强', bold: true })] }),
      new Paragraph({ children: [new TextRun('原有 E2E 测试存在不稳定问题，受 Ant Design Select 组件渲染时序影响。通过优化选择器鲁棒性和等待策略，注册/登录/语言切换/健康记录/成员管理全流程可稳定通过，为持续集成提供可靠的质量保障。')] }),
      new Paragraph({ numbering: { reference: 'numbered-list-1', level: 0 }, children: [new TextRun({ text: '测试报告生成优化', bold: true })] }),
      new Paragraph({ children: [new TextRun('Playwright HTML 报告默认生成但不自动启动，需要时可手动执行 npx playwright show-report 查看，减少测试执行时的干扰。')] }),
      
      new Paragraph({ spacing: { before: 240 }, heading: HeadingLevel.HEADING_2, children: [new TextRun('v1.0.1 (2025-12-24) - 批量导入与数据质量')] }),
      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('新增功能：批量导入健康记录')] }),
      
      // 批量导入核心特性表格
      new Table({
        columnWidths: [2340, 7020],
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({
                borders: cellBorders,
                width: { size: 2340, type: WidthType.DXA },
                shading: { fill: COLORS.lightGray, type: ShadingType.CLEAR },
                verticalAlign: VerticalAlign.CENTER,
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '特性', bold: true })] })]
              }),
              new TableCell({
                borders: cellBorders,
                width: { size: 7020, type: WidthType.DXA },
                shading: { fill: COLORS.lightGray, type: ShadingType.CLEAR },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '说明', bold: true })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun('支持格式')] })] }),
              new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun('Excel (.xlsx) / CSV (.csv)')] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun('文件限制')] })] }),
              new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun('最大 5MB，单次最多 1000 条记录')] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun('智能处理')] })] }),
              new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun('中英文表头自动识别、时区自动处理、成员智能匹配')] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun('错误处理')] })] }),
              new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun('逐行验证，跳过错误行继续导入，支持下载错误日志 CSV')] })] })
            ]
          })
        ]
      }),
      
      new Paragraph({ spacing: { before: 240 }, heading: HeadingLevel.HEADING_3, children: [new TextRun('修复问题：重复记录防护')] }),
      new Paragraph({ children: [new TextRun('同一成员在同一时间点可能被多次记录，导致数据冗余。通过添加唯一性验证（同一成员同一分钟内不可重复录入），批量导入时自动跳过重复记录，并提供 scripts/clean_duplicate_records.py 工具清理历史数据，确保数据准确性。')] }),
      
      new Paragraph({ spacing: { before: 240 }, heading: HeadingLevel.HEADING_3, children: [new TextRun('测试覆盖')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('单元测试：22 个新增测试用例（批量导入），通过率 100%')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('回归测试：15 个原有测试用例，通过率 100%')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('总计：37 个测试用例，0 失败')] }),
      
      new PageBreak(),
      
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('v1.0.0 (2025-11-28) - 权限与安全增强')] }),
      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('核心功能：超级管理员系统')] }),
      
      // 三级角色权限表格
      new Table({
        columnWidths: [2340, 7020],
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({
                borders: cellBorders,
                width: { size: 2340, type: WidthType.DXA },
                shading: { fill: COLORS.lightGray, type: ShadingType.CLEAR },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '角色', bold: true })] })]
              }),
              new TableCell({
                borders: cellBorders,
                width: { size: 7020, type: WidthType.DXA },
                shading: { fill: COLORS.lightGray, type: ShadingType.CLEAR },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '权限', bold: true })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'SUPER_ADMIN', bold: true })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun('管理所有用户账户、提升/降级管理员角色、重置任何用户密码')] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'ADMIN', bold: true })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun('查看用户列表、重置普通用户密码')] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'USER', bold: true })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun('管理个人健康数据')] })] })
            ]
          })
        ]
      }),
      
      new Paragraph({ spacing: { before: 240 }, heading: HeadingLevel.HEADING_3, children: [new TextRun('密码安全增强')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('密码策略：最少 8 位字符，必须包含字母和数字')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('首次登录引导：管理员重置密码后，用户首次登录必须修改')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('安全机制：Token 版本控制，重置密码后失效所有会话')] }),
      
      new PageBreak(),
      
      // 系统架构
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('系统架构')] }),
      
      new Table({
        columnWidths: [2340, 7020],
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({
                borders: cellBorders,
                width: { size: 2340, type: WidthType.DXA },
                shading: { fill: COLORS.lightGray, type: ShadingType.CLEAR },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '层级', bold: true })] })]
              }),
              new TableCell({
                borders: cellBorders,
                width: { size: 7020, type: WidthType.DXA },
                shading: { fill: COLORS.lightGray, type: ShadingType.CLEAR },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '技术', bold: true })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun('前端框架')] })] }),
              new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun('React 18')] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun('UI 组件库')] })] }),
              new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun('Ant Design 5')] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun('图表库')] })] }),
              new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun('ECharts 5')] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun('后端框架')] })] }),
              new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun('Flask 3.0')] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun('ORM')] })] }),
              new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun('SQLAlchemy 2.x')] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun('数据库')] })] }),
              new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun('SQLite (开发) / MySQL (生产)')] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun('部署')] })] }),
              new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun('Docker, Kubernetes, Azure Container Apps')] })] })
            ]
          })
        ]
      }),
      
      new PageBreak(),
      
      // 性能指标
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('性能指标')] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('批量导入性能')] }),
      
      new Table({
        columnWidths: [3120, 3120, 3120],
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({
                borders: cellBorders,
                width: { size: 3120, type: WidthType.DXA },
                shading: { fill: COLORS.lightGray, type: ShadingType.CLEAR },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '记录数', bold: true })] })]
              }),
              new TableCell({
                borders: cellBorders,
                width: { size: 3120, type: WidthType.DXA },
                shading: { fill: COLORS.lightGray, type: ShadingType.CLEAR },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '处理时间', bold: true })] })]
              }),
              new TableCell({
                borders: cellBorders,
                width: { size: 3120, type: WidthType.DXA },
                shading: { fill: COLORS.lightGray, type: ShadingType.CLEAR },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '内存占用', bold: true })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun('100 条')] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun('< 1 秒')] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun('~10 MB')] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun('500 条')] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun('~3 秒')] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun('~30 MB')] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun('1000 条')] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun('~8 秒')] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun('~50 MB')] })] })
            ]
          })
        ]
      }),
      
      new Paragraph({ spacing: { before: 240 }, children: [new TextRun({ text: '优化措施：', bold: true })] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('批量插入：使用 SQLAlchemy bulk_save_objects()，单次事务提交')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('流式处理：Pandas 分块读取大文件，减少内存峰值')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('索引优化：Member + RecordDate 复合索引，加速重复检测')] }),
      
      new PageBreak(),
      
      // 测试覆盖
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('测试覆盖')] }),
      
      new Table({
        columnWidths: [3120, 3120, 3120],
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({
                borders: cellBorders,
                width: { size: 3120, type: WidthType.DXA },
                shading: { fill: COLORS.lightGray, type: ShadingType.CLEAR },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '测试类型', bold: true })] })]
              }),
              new TableCell({
                borders: cellBorders,
                width: { size: 3120, type: WidthType.DXA },
                shading: { fill: COLORS.lightGray, type: ShadingType.CLEAR },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '用例数', bold: true })] })]
              }),
              new TableCell({
                borders: cellBorders,
                width: { size: 3120, type: WidthType.DXA },
                shading: { fill: COLORS.lightGray, type: ShadingType.CLEAR },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '通过率', bold: true })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun('单元测试')] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun('37')] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '100%', color: COLORS.accent, bold: true })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun('E2E 测试')] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun('15')] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '100%', color: COLORS.accent, bold: true })] })] })
            ]
          })
        ]
      }),
      
      new Paragraph({ spacing: { before: 240 }, heading: HeadingLevel.HEADING_2, children: [new TextRun('v1.1.0 测试改进')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('选择器稳定性：解决 Ant Design Select 组件渲染时序问题')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('等待策略优化：确保元素完全可见后再操作')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('报告生成：默认生成 HTML 报告，支持离线查看')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('CI/CD 友好：测试失败时自动截图和视频录制')] }),
      
      new PageBreak(),
      
      // 下一步计划
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('下一步计划')] }),
      
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('短期计划（v1.2.0）')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('批量导入前端 UI（文件上传、进度显示、结果展示）')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('数据导出增强（Excel 格式、自定义字段）')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('图表交互优化（悬浮详情、时间范围选择）')] }),
      
      new Paragraph({ spacing: { before: 240 }, heading: HeadingLevel.HEADING_2, children: [new TextRun('中期计划（v1.3.0）')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('数据分析增强（趋势预测、智能提醒、周期性报告）')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('第三方集成（Apple Health、Google Fit、智能穿戴设备）')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('协作功能（家庭共享、医生访问授权）')] }),
      
      new Paragraph({ spacing: { before: 240 }, heading: HeadingLevel.HEADING_2, children: [new TextRun('长期愿景（v2.0.0）')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('移动应用（iOS / Android 原生 App、小程序）')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('AI 辅助（健康建议推荐、异常模式识别）')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('企业版功能（多租户、高级权限、审计日志）')] }),
      
      new PageBreak(),
      
      // 统计数据
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('统计数据')] }),
      
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('代码统计')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('总代码行数：约 15,000 行')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('后端：约 8,000 行（Python）')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('前端：约 6,000 行（JavaScript/JSX）')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('测试：约 1,000 行（Pytest/Playwright）')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('测试覆盖率：85%+')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('API 端点数：25+')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('数据模型数：4 个核心模型')] }),
      
      new Paragraph({ spacing: { before: 240 }, heading: HeadingLevel.HEADING_2, children: [new TextRun('功能模块')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('用户认证授权')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('健康记录管理')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('家庭成员管理')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('数据可视化')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('批量导入导出')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('三级权限管理')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('密码安全策略')] }),
      new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun('国际化支持')] }),
      
      new PageBreak(),
      
      // 致谢
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('致谢')] }),
      new Paragraph({ 
        spacing: { after: 240 },
        children: [new TextRun('感谢所有为健康记录平台贡献的开发者、测试人员和用户！')] 
      }),
      
      new Paragraph({ 
        alignment: AlignmentType.CENTER,
        spacing: { before: 360 },
        children: [new TextRun({ text: 'Generated by Copilot', italics: true, color: '7F8C8D' })] 
      }),
      new Paragraph({ 
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: '健康记录平台 v1.1.0', italics: true, color: '7F8C8D' })] 
      }),
      new Paragraph({ 
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: '本文档最后更新：2026-01-19', italics: true, color: '7F8C8D', size: 20 })] 
      })
    ]
  }]
});

// Save
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('docs/reports/健康记录平台月度报告_2026-01.docx', buffer);
  console.log('✓ Word document created: docs/reports/健康记录平台月度报告_2026-01.docx');
}).catch(err => {
  console.error('Failed to create Word document:', err);
  process.exit(1);
});
