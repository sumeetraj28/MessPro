import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Export data to XLSX file
 * @param {Array} data - Array of objects
 * @param {Array} columns - [{ header: 'Display Name', key: 'field_name' }]
 * @param {string} filename - e.g. 'items' (without extension)
 * @param {string} sheetName - worksheet name
 */
export function exportToExcel(data, columns, filename, sheetName = 'Sheet1') {
  const headers = columns.map(c => c.header);
  const rows = data.map(row => columns.map(c => c.format ? c.format(row[c.key], row) : row[c.key] ?? ''));
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Auto column widths
  ws['!cols'] = columns.map((c, i) => ({
    wch: Math.max(c.header.length, ...rows.map(r => String(r[i] ?? '').length).slice(0, 100)) + 2
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), `${filename}.xlsx`);
}

/**
 * Generate a sample/template XLSX for import
 * @param {Array} columns - [{ header: 'Name', key: 'name', example: 'Onion' }]
 * @param {string} filename
 */
export function downloadTemplate(columns, filename) {
  const headers = columns.map(c => c.header);
  const example = columns.map(c => c.example ?? '');
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  ws['!cols'] = columns.map(c => ({ wch: Math.max(c.header.length, String(c.example ?? '').length) + 2 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), `${filename}_template.xlsx`);
}

/**
 * Read an XLSX file and return parsed rows as objects
 * @param {File} file
 * @param {Array} columns - [{ header: 'Display Name', key: 'field_key' }]
 * @returns {Promise<Array>} parsed rows
 */
export function importFromExcel(file, columns) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(ws, { defval: '' });

        // Map Excel headers to our keys
        const headerMap = {};
        columns.forEach(c => {
          headerMap[c.header.toLowerCase().trim()] = c.key;
        });

        const parsed = rawRows.map(row => {
          const obj = {};
          Object.entries(row).forEach(([excelHeader, value]) => {
            const key = headerMap[excelHeader.toLowerCase().trim()];
            if (key) obj[key] = value;
          });
          return obj;
        }).filter(obj => Object.keys(obj).length > 0);

        resolve(parsed);
      } catch (err) {
        reject(new Error('Failed to parse Excel file: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Export report data to PDF
 * @param {Object} options
 * @param {string} options.title - Report title
 * @param {string} options.subtitle - e.g. period range
 * @param {Array} options.summaryRows - [{ label: 'Total Income', value: '₹50,000' }]
 * @param {Array} options.tables - [{ title: 'Daily Breakdown', headers: [...], rows: [[...], ...] }]
 * @param {string} options.filename
 */
export function exportToPDF({ title, subtitle, summaryRows = [], tables = [], filename }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, y, { align: 'center' });
  y += 8;

  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(subtitle, pageWidth / 2, y, { align: 'center' });
    doc.setTextColor(0);
    y += 8;
  }

  // Summary section
  if (summaryRows.length > 0) {
    doc.setFontSize(10);
    const colW = (pageWidth - 28) / 2;
    summaryRows.forEach((row, i) => {
      const x = 14 + (i % 2) * colW;
      if (i % 2 === 0 && i > 0) y += 6;
      doc.setFont('helvetica', 'normal');
      doc.text(row.label + ':', x, y);
      doc.setFont('helvetica', 'bold');
      doc.text(String(row.value), x + colW - 5, y, { align: 'right' });
    });
    if (summaryRows.length % 2 !== 0) y += 6;
    y += 6;
  }

  // Tables
  tables.forEach((table, idx) => {
    if (idx > 0) y += 4;
    if (table.title) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(table.title, 14, y);
      y += 2;
    }

    autoTable(doc, {
      startY: y,
      head: [table.headers],
      body: table.rows,
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229], fontSize: 8, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 255] },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 6;
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Generated on ${new Date().toLocaleString('en-IN')} | MessPro`, 14, doc.internal.pageSize.getHeight() - 8);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
  }

  doc.save(`${filename}.pdf`);
}

/**
 * Export report data to Excel with formatted sheet
 * @param {Object} options
 * @param {string} options.title
 * @param {Array} options.summaryRows - [{ label, value }]
 * @param {Array} options.tables - [{ title, headers, rows }]
 * @param {string} options.filename
 */
export function exportReportToExcel({ title, summaryRows = [], tables = [], filename }) {
  const wsData = [];

  // Title
  wsData.push([title]);
  wsData.push([]);

  // Summary
  if (summaryRows.length > 0) {
    summaryRows.forEach(r => wsData.push([r.label, r.value]));
    wsData.push([]);
  }

  // Tables
  tables.forEach(table => {
    if (table.title) wsData.push([table.title]);
    wsData.push(table.headers);
    table.rows.forEach(r => wsData.push(r));
    wsData.push([]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  // Auto column widths from all data
  const maxCols = Math.max(...wsData.map(r => r.length));
  ws['!cols'] = Array.from({ length: maxCols }, (_, i) => ({
    wch: Math.max(...wsData.map(r => String(r[i] ?? '').length).slice(0, 200)) + 2
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), `${filename}.xlsx`);
}
