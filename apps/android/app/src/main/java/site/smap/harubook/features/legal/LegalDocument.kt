package site.smap.harubook.features.legal

import android.content.Context
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import site.smap.harubook.core.networking.AppConfig

/**
 * iOS LegalDocument.swift 미러. 인앱 WebView 대신 Chrome Custom Tabs 사용.
 */
enum class LegalDocument(val key: String, val title: String) {
    Terms("terms", "이용약관"),
    Privacy("privacy", "개인정보처리방침"),
    Refund("refund", "환불정책"),
    Business("business", "사업자정보");

    fun url(): String = "${AppConfig.API_BASE_URL}/legal/$key"
}

fun Context.openLegal(doc: LegalDocument) {
    CustomTabsIntent.Builder()
        .setShowTitle(true)
        .build()
        .launchUrl(this, Uri.parse(doc.url()))
}
