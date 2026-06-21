function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function extractFilename(contentDisposition, fallback) {
  if (!contentDisposition) return fallback;
  const match = contentDisposition.match(/filename="([^"]+)"/);
  return match?.[1] ?? fallback;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatFilterLabel(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (char) => char.toUpperCase());
}

function buildReportHtml({ title, filters, summary, charts }) {
  const filterRows = Object.entries(filters ?? {})
    .filter(([, value]) => value)
    .map(
      ([key, value]) =>
        `<tr><td>${escapeHtml(formatFilterLabel(key))}</td><td>${escapeHtml(value)}</td></tr>`,
    )
    .join('');

  const summaryRows = Object.entries(summary ?? {})
    .map(
      ([key, value]) =>
        `<tr><td>${escapeHtml(formatFilterLabel(key))}</td><td>${escapeHtml(value)}</td></tr>`,
    )
    .join('');

  const chartSections = [
    ['Activity trend', charts?.activityTrend],
    ['Status breakdown', charts?.statusBreakdown],
    ['SLA trend', charts?.slaTrend],
    ['Correction trend', charts?.correctionTrend],
    ['Turnaround trend', charts?.turnaroundTrend],
    ['Rejection reasons', charts?.rejectionReasons],
    ['Queue wait trend', charts?.queueWaitTrend],
  ]
    .filter(([, rows]) => Array.isArray(rows) && rows.length > 0)
    .map(([heading, rows]) => {
      const columns = Object.keys(rows[0] ?? {});
      const header = columns.map((column) => `<th>${escapeHtml(formatFilterLabel(column))}</th>`).join('');
      const body = rows
        .map(
          (row) =>
            `<tr>${columns.map((column) => `<td>${escapeHtml(row[column])}</td>`).join('')}</tr>`,
        )
        .join('');
      return `<section><h2>${escapeHtml(heading)}</h2><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></section>`;
    })
    .join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      * { box-sizing: border-box; }
      body {
        font-family: Arial, sans-serif;
        color: #052E1C;
        margin: 0;
        padding: 16px 20px;
        font-size: 12px;
        line-height: 1.4;
      }
      h1 { margin: 0 0 6px; font-size: 22px; line-height: 1.2; }
      .meta { color: #4B6358; margin: 0 0 16px; font-size: 11px; }
      section { margin-top: 16px; }
      h2 {
        font-size: 14px;
        margin: 0 0 8px;
        page-break-after: avoid;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
        page-break-inside: auto;
      }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; page-break-after: auto; }
      th, td {
        border: 1px solid #E2EEE8;
        padding: 5px 7px;
        text-align: left;
        vertical-align: top;
      }
      th { background: #F6FAF5; }
      .report-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        align-items: start;
      }
      @page {
        size: A4 portrait;
        margin: 12mm;
      }
      @media print {
        body { padding: 0; }
        section { margin-top: 14px; }
        .report-grid { gap: 12px; }
      }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <p class="meta">Generated ${escapeHtml(new Date().toLocaleString())}</p>
    <div class="report-grid">
      <section>
        <h2>Filters</h2>
        <table><tbody>${filterRows || '<tr><td colspan="2">No filters applied</td></tr>'}</tbody></table>
      </section>
      <section>
        <h2>Summary</h2>
        <table><tbody>${summaryRows}</tbody></table>
      </section>
    </div>
    ${chartSections}
  </body>
</html>`;
}

export async function downloadAnalyticsCsv(response, fallbackName = 'dashboard-report.csv') {
  const filename = extractFilename(response.headers['content-disposition'], fallbackName);
  const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, filename);
}

/**
 * Opens the browser print dialog with a formatted analytics report.
 * Choose "Save as PDF" in the print dialog to download a PDF file.
 * @returns {boolean}
 */
export function printAnalyticsPdf({ title, filters, summary, charts }) {
  const html = buildReportHtml({ title, filters, summary, charts });
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', title);
  iframe.style.cssText =
    'position:fixed;left:0;top:0;width:210mm;height:297mm;border:0;opacity:0;pointer-events:none;z-index:-1;';

  const cleanup = () => {
    window.setTimeout(() => {
      iframe.remove();
    }, 1000);
  };

  const triggerPrint = () => {
    window.setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        cleanup();
      }
    }, 150);
  };

  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    return false;
  }

  doc.open();
  doc.write(html);
  doc.close();

  if (doc.readyState === 'complete') {
    triggerPrint();
    return true;
  }

  iframe.onload = () => {
    triggerPrint();
  };

  return true;
}

/**
 * Downloads the analytics report as an HTML file (fallback when print is blocked).
 */
export function downloadAnalyticsHtml({ title, filters, summary, charts }, filename = 'dashboard-report.html') {
  const html = buildReportHtml({ title, filters, summary, charts });
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  downloadBlob(blob, filename);
}
