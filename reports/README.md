# Reports: NEV analysis

This folder contains a small script to generate a Markdown report and charts
for China NEV (new energy vehicles) using IEA's Global EV Data Explorer dataset.

Quick steps:

1. Create a Python environment (use your existing project environment).
2. Install dependencies:

```bash
pip install -r reports/requirements_report.txt
```

3. Run the generator:

```bash
python reports/generate_nev_report.py
```

4. Open the generated file `reports/NEV_report.md` in your Markdown viewer.

Notes
- The script downloads the IEA dataset `EVDataExplorer2025.xlsx` into
  `reports/data/` and caches it locally.
- If you want deeper analysis (更多机构数据，或更多图表), tell me which
  sources to include next (McKinsey, BNEF, S&P, 本地 CAAM 表格解析等)。
