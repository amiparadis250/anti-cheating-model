const cell = value => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function downloadCsv(filename, columns, rows) {
  const header = columns.map(c => cell(c.label)).join(',');
  const body = rows.map(row => columns.map(c => cell(c.value(row))).join(','));
  const blob = new Blob([`﻿${[header, ...body].join('\r\n')}`], {type: 'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export const ALERT_COLUMNS = [
  {label: 'Alert ID', value: a => a.id},
  {label: 'Date', value: a => a.date},
  {label: 'Time', value: a => a.time},
  {label: 'Room', value: a => a.room},
  {label: 'Detection', value: a => a.type},
  {label: 'Model', value: a => a.model},
  {label: 'Confidence %', value: a => a.confidence},
  {label: 'Priority', value: a => a.priority},
  {label: 'Status', value: a => a.status},
  {label: 'Reviewed by', value: a => a.reviewedBy},
  {label: 'Reviewed at', value: a => a.reviewedAt},
];
