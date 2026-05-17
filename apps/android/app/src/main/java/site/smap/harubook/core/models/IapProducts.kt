package site.smap.harubook.core.models

/**
 * 백엔드 `src/lib/iap/products.ts` 미러. Play Console 등록 SKU 와 동일해야 한다.
 */
val IAP_PRODUCT_STARS: Map<String, Int> = mapOf(
    "com.smap.harubook.star_small" to 10,
    "com.smap.harubook.star_medium" to 60,
    "com.smap.harubook.star_large" to 130,
)
