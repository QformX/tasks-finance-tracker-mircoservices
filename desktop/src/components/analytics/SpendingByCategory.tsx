import { useLanguage } from "@/context/LanguageContext";
import type { Purchase, Category } from "@/types";

interface SpendingByCategoryProps {
    purchases: Purchase[];
    categories: Category[];
}

export function SpendingByCategory({ purchases, categories }: SpendingByCategoryProps) {
    const { t } = useLanguage();
    
    const categorySpending = purchases.reduce((acc, p) => {
        const catId = p.category_id || "uncategorized";
        const cost = (p.cost || 0) * p.quantity;
        acc[catId] = (acc[catId] || 0) + cost;
        return acc;
    }, {} as Record<string, number>);

    const totalSpending = Object.values(categorySpending).reduce((a, b) => a + b, 0);

    // Default palette
    const palette = ["#8B5CF6", "#A78BFA", "#C4B5FD", "#4B5563", "#EC4899", "#F59E0B", "#10B981"];

    const spendingData = Object.entries(categorySpending).map(([catId, amount], index) => {
        const category = categories.find(c => c.id === catId);
        return {
            id: catId,
            name: category?.title || t("uncategorized") || "Uncategorized",
            color: category?.color || palette[index % palette.length],
            amount,
            percentage: totalSpending > 0 ? (amount / totalSpending) * 100 : 0
        };
    }).sort((a, b) => b.amount - a.amount);

    // Generate conic gradient string
    const { parts: gradientParts } = spendingData.reduce((acc, item) => {
        const start = acc.currentPercentage;
        const end = acc.currentPercentage + item.percentage;
        acc.parts.push(`${item.color} ${start}% ${end}%`);
        acc.currentPercentage = end;
        return acc;
    }, { currentPercentage: 0, parts: [] as string[] });
    
    const gradient = gradientParts.length > 0 
        ? `conic-gradient(${gradientParts.join(", ")})`
        : "conic-gradient(var(--color-text-950) 0% 100%)"; // Fallback color needs to be handled carefully or just use a neutral gray

    return (
        <>
            <h3 className="text-base font-bold text-text-950 mb-6 self-start">{t("spending_breakdown") || "Spending Breakdown"}</h3>
            <div className="flex flex-col items-center justify-center flex-1 w-full">
                <div className="relative w-48 h-48 rounded-full mb-6" style={{ background: gradient }}>
                    <div className="absolute inset-0 m-8 bg-surface-dark rounded-full flex flex-col items-center justify-center shadow-inner">
                        <span className="text-xs text-text-secondary">{t("total") || "Total"}</span>
                        <span className="text-xl font-bold text-text-950">${totalSpending.toLocaleString()}</span>
                    </div>
                </div>
                <div className="w-full space-y-3">
                    {spendingData.slice(0, 4).map(item => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                <span className="text-text-secondary">{item.name}</span>
                            </div>
                            <span className="font-semibold text-text-950">{Math.round(item.percentage)}%</span>
                        </div>
                    ))}
                    {spendingData.length > 4 && (
                        <div className="text-center text-xs text-text-secondary pt-2">
                            + {spendingData.length - 4} {t("more_categories") || "more"}
                        </div>
                    )}
                    {spendingData.length === 0 && (
                        <div className="text-center text-text-secondary text-sm">{t("no_spending_data") || "No spending data"}</div>
                    )}
                </div>
            </div>
        </>
    );
}
