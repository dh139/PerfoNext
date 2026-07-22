const escapeCsvCell = (value) => {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

// columns: [{ key, label }], rows: array of objects (dot-path keys supported, e.g. 'employee.firstName')
export const exportToCsv = (filename, columns, rows) => {
  const getValue = (row, key) => key.split('.').reduce((acc, part) => (acc == null ? acc : acc[part]), row);

  const header = columns.map(c => escapeCsvCell(c.label)).join(',');
  const lines = rows.map(row =>
    columns.map(c => escapeCsvCell(c.render ? c.render(row) : getValue(row, c.key))).join(',')
  );

  const csvContent = [header, ...lines].join('\r\n');
  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
