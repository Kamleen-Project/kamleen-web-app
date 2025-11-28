export function formatCurrency(value: number, currency: string = "USD"): string {
    const formattedValue = new Intl.NumberFormat("en-US", {
        style: "decimal",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
    return `${formattedValue} ${currency.toUpperCase()}`;
}
