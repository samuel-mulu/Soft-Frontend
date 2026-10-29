import { amount } from '@/lib/api';

export type ReportActivityLine = {
  date: string;
  customerName: string;
  label: string;
  received: string | null;
  credited: string | null;
  bottleDelta: number | null;
  bottleTypeName: string | null;
};

export type ReportViewTab = 'summary' | 'payment' | 'bottle';

export type ReportPrintData = {
  periodLabel: string;
  from: string;
  to: string;
  view: ReportViewTab;
  salesRevenue: string;
  cashReceived: string;
  credited: string;
  bottlesOut: number;
  bottlesIn: number;
  expenses: string;
  estimatedNetProfit: string;
  salesCount?: number;
  lines: ReportActivityLine[];
  paymentOnly?: boolean;
  bottleOnly?: boolean;
};

function moneyPrint(v: string | number | undefined | null) {
  if (v == null || v === '') return '—';
  return `${amount(v)} ETB`;
}

function bottlePrint(delta: number | null, type: string | null) {
  if (delta == null || !type) return '—';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta} ${type}`;
}

function viewTitle(view: ReportViewTab) {
  if (view === 'payment') return 'Payments';
  if (view === 'bottle') return 'Bottles';
  return 'Summary';
}

function buildReportHtml(data: ReportPrintData, autoPrint: boolean) {
  const lineRows = data.lines
    .map((r) => {
      if (data.view === 'payment') {
        return `<tr><td>${r.date}</td><td>${escapeHtml(r.customerName)}</td><td>${escapeHtml(r.label)}</td><td>${moneyPrint(r.received)}</td><td>${moneyPrint(r.credited)}</td></tr>`;
      }
      if (data.view === 'bottle') {
        return `<tr><td>${r.date}</td><td>${escapeHtml(r.customerName)}</td><td>${escapeHtml(r.label)}</td><td>${escapeHtml(bottlePrint(r.bottleDelta, r.bottleTypeName))}</td></tr>`;
      }
      return `<tr><td>${r.date}</td><td>${escapeHtml(r.customerName)}</td><td>${escapeHtml(r.label)}</td><td>${moneyPrint(r.received)}</td><td>${moneyPrint(r.credited)}</td><td>${escapeHtml(bottlePrint(r.bottleDelta, r.bottleTypeName))}</td></tr>`;
    })
    .join('');

  const tableHead =
    data.view === 'payment'
      ? '<tr><th>Date</th><th>Customer</th><th>Detail</th><th>Received</th><th>Credited</th></tr>'
      : data.view === 'bottle'
        ? '<tr><th>Date</th><th>Customer</th><th>Detail</th><th>Bottles</th></tr>'
        : '<tr><th>Date</th><th>Customer</th><th>Detail</th><th>Received</th><th>Credited</th><th>Bottles</th></tr>';
  const colSpan = data.view === 'summary' ? 6 : 5;

  const metrics =
    data.view === 'payment'
      ? `<div class="metrics"><div class="metric"><label>Received</label><strong>${moneyPrint(data.cashReceived)}</strong></div><div class="metric"><label>Credit (sales)</label><strong>${moneyPrint(data.credited)}</strong></div><div class="metric"><label>Rows</label><strong>${data.lines.length}</strong></div></div>`
      : data.view === 'bottle'
        ? `<div class="metrics"><div class="metric"><label>Bottles out</label><strong>+${data.bottlesOut}</strong></div><div class="metric"><label>Bottles in</label><strong>−${data.bottlesIn}</strong></div><div class="metric"><label>Rows</label><strong>${data.lines.length}</strong></div></div>`
        : `<div class="metrics"><div class="metric"><label>Sales</label><strong>${moneyPrint(data.salesRevenue)}</strong></div><div class="metric"><label>Received</label><strong>${moneyPrint(data.cashReceived)}</strong></div><div class="metric"><label>Credit (sales)</label><strong>${moneyPrint(data.credited)}</strong></div><div class="metric"><label>Bottles out / in</label><strong>+${data.bottlesOut} / −${data.bottlesIn}</strong></div><div class="metric"><label>Expenses</label><strong>${moneyPrint(data.expenses)}</strong></div><div class="metric"><label>Net profit (est.)</label><strong>${moneyPrint(data.estimatedNetProfit)}</strong></div></div>`;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>Report ${data.from}${data.from !== data.to ? ` – ${data.to}` : ''}</title>
<style>
  *{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#192821;margin:0;padding:24px;font-size:13px}
  h1{font-size:20px;margin:0 0 4px} .sub{color:#728078;margin:0 0 20px;font-size:12px}
  .metrics{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:22px}
  .metric{border:1px solid #e5eae5;border-radius:10px;padding:12px}
  .metric label{display:block;font-size:10px;font-weight:700;text-transform:uppercase;color:#728078;margin-bottom:4px}
  .metric strong{font-size:16px}
  h2{font-size:14px;margin:18px 0 8px}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #edf1ed;padding:8px 10px;text-align:left}
  th{font-size:10px;text-transform:uppercase;color:#728078;background:#fbfcfb}
  .toolbar{margin-bottom:16px}
  @media print{.no-print{display:none!important}body{padding:12px}}
</style></head><body>
  <div class="toolbar no-print"><button type="button" onclick="window.print()">Print / Save as PDF</button></div>
  ${autoPrint ? `<script>window.addEventListener('load',function(){setTimeout(function(){window.focus();window.print();},200);});<\/script>` : ''}
  <h1>FlowStock — ${viewTitle(data.view)}</h1>
  <p class="sub">${escapeHtml(data.periodLabel)} · ${data.from}${data.from !== data.to ? ` → ${data.to}` : ''}</p>
  ${metrics}
  ${data.view === 'summary' && !data.lines.length ? '' : `<h2>${data.view === 'summary' ? 'All activity' : 'Details'}</h2><table><thead>${tableHead}</thead><tbody>${lineRows || `<tr><td colspan="${colSpan}">No rows for this filter.</td></tr>`}</tbody></table>`}
</body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function printHtml(html: string, autoPrint: boolean) {
  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
    if (autoPrint) w.addEventListener('load', () => setTimeout(() => w.print(), 200));
    return true;
  }
  const iframe = document.createElement('iframe');
  iframe.setAttribute('style', 'position:fixed;width:0;height:0;border:0');
  document.body.appendChild(iframe);
  const win = iframe.contentWindow;
  const doc = iframe.contentDocument || win?.document;
  if (!doc || !win) {
    iframe.remove();
    return false;
  }
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    win.focus();
    win.print();
    setTimeout(() => iframe.remove(), 2000);
  }, 350);
  return true;
}

export function printReport(data: ReportPrintData, opts?: { autoPrint?: boolean }) {
  const autoPrint = opts?.autoPrint !== false;
  return printHtml(buildReportHtml(data, autoPrint), autoPrint);
}
