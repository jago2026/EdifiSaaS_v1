
export function formatNumber(num: number | undefined | null, decimals: number = 2): string {
  if (num === undefined || num === null || isNaN(num)) return "-";
  const parts = num.toFixed(decimals).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return parts.join(',');
}

export function formatCurrency(amount: number | undefined | null, decimals: number = 2): string {
  return formatNumber(amount, decimals);
}

export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

export function formatBs(amount: number | undefined | null): string {
  return formatNumber(amount, 2);
}

export function formatUsd(amount: number | undefined | null): string {
  return formatNumber(amount, 2);
}
