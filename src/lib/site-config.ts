// ─────────────────────────────────────────────────────────
// Site Configuration Types + Defaults
// ─────────────────────────────────────────────────────────

export interface SiteConfig {
  title: string;
  subtitle: string;
  description: string;
  discountBadge: string;
  price: number;
  oldPrice: number;
  deliveryCostDesk: number;
  deliveryCostHome: number;
  /** Ordered list of watch IDs to show on the landing page */
  watchIds: number[];
}

export const DEFAULT_CONFIG: SiteConfig = {
  title: "بوكس الفخامة",
  subtitle: "الأكثر مبيعاً في الجزائر",
  description: "10 موديل حصري — ساعة + طقم إكسسوارات + توصيل لباب بيتك.",
  discountBadge: "خصم 25%",
  price: 1500,
  oldPrice: 2000,
  deliveryCostDesk: 500,
  deliveryCostHome: 800,
  watchIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
};
