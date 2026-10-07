export function toCsv(headers: string[], rows: string[][]): string {
  const quote = (value: string) => {
    const safeValue = /^[\s\uFEFF]*[=+\-@]/.test(value) ? `'${value}` : value;
    return `"${safeValue.replace(/"/g, '""')}"`;
  };
  return [headers, ...rows].map((row) => row.map(quote).join(",")).join("\r\n");
}

export function downloadCsv(filename: string, headers: string[], rows: string[][]): void {
  const blob = new Blob(["\uFEFF", toCsv(headers, rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
