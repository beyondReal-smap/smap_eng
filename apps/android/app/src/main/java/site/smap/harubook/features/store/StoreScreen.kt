package site.smap.harubook.features.store

import android.app.Activity
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.SignalWifiOff
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.android.billingclient.api.ProductDetails
import site.smap.harubook.core.models.IAP_PRODUCT_STARS
import site.smap.harubook.designsystem.PrimaryButton
import site.smap.harubook.designsystem.PrimaryButtonVariant
import site.smap.harubook.designsystem.SmapBackground
import site.smap.harubook.designsystem.SmapBadgeStyle
import site.smap.harubook.designsystem.SmapBodyEmphasisStyle
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapCaptionStyle
import site.smap.harubook.designsystem.SmapDanger
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapMutedBg
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapPrimaryForeground
import site.smap.harubook.designsystem.SmapPrimarySoft
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText
import site.smap.harubook.designsystem.SmapTitleStyle
import site.smap.harubook.designsystem.SmapWarn

/**
 * 별 충전(IAP) 화면 — iOS `StoreView.swift` 패리티. Play Billing v7 통합.
 *
 * Hero(큰 별 + 슬로건), 상품 카드(추천 배지 · perStar 단가 · 강조 배경), 결제 안내(정책 박스) 까지
 * iOS 와 동일한 시각/내용 위계.
 */
@Composable
fun StoreScreen(
    onBack: () -> Unit,
    viewModel: StoreViewModel = viewModel(),
) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current
    val activity = (context as? Activity)
        ?: error("StoreScreen 은 Activity 컨텍스트에서 호출되어야 합니다.")

    LaunchedEffect(state.lastGrantedStars) {
        if (state.lastGrantedStars != null) {
            kotlinx.coroutines.delay(2_000)
            viewModel.consumeLastGrant()
        }
    }

    Column(modifier = Modifier.fillMaxSize().background(SmapBackground)) {
        TopBar(onBack)

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Hero()

            when {
                state.isConnecting && state.products.isEmpty() ->
                    LoadingBlock("결제 모듈을 준비 중이에요…")
                !state.errorMessage.isNullOrBlank() && state.products.isEmpty() ->
                    EmptyError(state.errorMessage.orEmpty(), viewModel::retryQueryProducts)
                state.products.isEmpty() ->
                    LoadingBlock("상품 정보를 불러오는 중이에요…")
                else -> state.products.forEach { product ->
                    ProductCard(
                        product = product,
                        purchasing = state.purchasingProductId == product.productId,
                        anyPurchasing = state.purchasingProductId != null,
                        onPurchase = { viewModel.purchase(activity, product) },
                    )
                }
            }

            state.lastGrantedStars?.let { stars -> GrantedToast(stars) }
            state.errorMessage?.takeIf { state.products.isNotEmpty() }?.let { msg ->
                Text(msg, style = SmapCaptionStyle, color = SmapDanger, textAlign = TextAlign.Center)
            }

            // iOS policySection 패리티 — 결제는 Google Play 통해 처리. 환불 안내까지.
            PolicySection()
        }
    }
}

/** 정중앙 "별 충전" 타이틀 + 좌측 뒤로 — iOS NavigationStack navigationTitle 패리티. */
@Composable
private fun TopBar(onBack: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            Icons.AutoMirrored.Filled.ArrowBack,
            contentDescription = "뒤로",
            tint = SmapText,
            modifier = Modifier.size(28.dp).clickable(onClick = onBack),
        )
        Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.Center) {
            Text("별 충전", style = SmapBodyEmphasisStyle, color = SmapText)
        }
        Box(modifier = Modifier.size(28.dp))
    }
}

/**
 * iOS hero 패리티 — 큰 코랄 원 + 노란(smapWarn) 별 아이콘 + "별로 새 동화를 만들어요" 제목 + 부제.
 */
@Composable
private fun Hero() {
    Column(
        modifier = Modifier.fillMaxWidth().padding(top = 4.dp, bottom = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Box(
            modifier = Modifier
                .size(96.dp)
                .background(SmapPrimarySoft, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = Icons.Filled.Star,
                contentDescription = null,
                tint = SmapWarn,
                modifier = Modifier.size(44.dp),
            )
        }
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text(
                text = "별로 새 동화를 만들어요",
                style = SmapTitleStyle.copy(fontSize = 22.sp),
                color = SmapText,
            )
            Text(
                text = "별 한 개 = 새 동화 한 권",
                style = SmapBodyStyle.copy(fontSize = 14.sp),
                color = SmapMuted,
            )
        }
    }
}

/** product id 별 메타데이터 (제목/배지/추천 여부). 서버 `src/lib/iap/products.ts` 와 동기. */
private data class StarPackMeta(
    val title: String,
    val stars: Int,
    val badge: String?,
    val isPopular: Boolean,
)

private fun starPackMetaFor(productId: String): StarPackMeta? = when (productId) {
    "com.smap.harubook.star_small" -> StarPackMeta("별 10개", 10, badge = null, isPopular = false)
    "com.smap.harubook.star_medium" -> StarPackMeta("별 60개", 60, badge = "가장 인기", isPopular = true)
    "com.smap.harubook.star_large" -> StarPackMeta("별 130개", 130, badge = "가장 알뜰", isPopular = false)
    else -> null
}

/** "₩5,500" 등에서 숫자만 추출해 별 1개당 단가 계산. iOS perStarLabel 패리티. */
private fun perStarLabel(displayPrice: String, stars: Int): String? {
    if (stars <= 0) return null
    val digits = displayPrice.filter { it.isDigit() }
    val total = digits.toIntOrNull() ?: return null
    val per = (total.toDouble() / stars.toDouble()).toInt()
    return "별 1개당 약 ${per}원"
}

@Composable
private fun ProductCard(
    product: ProductDetails,
    purchasing: Boolean,
    anyPurchasing: Boolean,
    onPurchase: () -> Unit,
) {
    val offer = product.oneTimePurchaseOfferDetails
    val price = offer?.formattedPrice ?: "—"
    val meta = starPackMetaFor(product.productId)
    val stars = meta?.stars ?: IAP_PRODUCT_STARS[product.productId] ?: 0
    val title = meta?.title ?: product.name.ifEmpty { "별 $stars" }
    val isHighlighted = meta?.isPopular == true
    val perStar = perStarLabel(price, stars)

    // 추천 묶음은 코랄 소프트 배경 + 코랄 보더로 강조. 일반은 흰 배경 + 회색 보더.
    Box(modifier = Modifier.fillMaxWidth().padding(top = 10.dp)) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    if (isHighlighted) SmapPrimarySoft.copy(alpha = 0.5f) else SmapSurface,
                    RoundedCornerShape(22.dp),
                )
                .border(
                    width = if (isHighlighted) 1.5.dp else 1.dp,
                    color = if (isHighlighted) SmapPrimary.copy(alpha = 0.45f) else SmapBorder,
                    shape = RoundedCornerShape(22.dp),
                )
                .padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .background(
                            if (isHighlighted) SmapPrimary.copy(alpha = 0.18f) else SmapPrimarySoft,
                            CircleShape,
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.Filled.Star,
                        contentDescription = null,
                        tint = SmapWarn,
                        modifier = Modifier.size(26.dp),
                    )
                }
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Text(title, style = SmapTitleStyle.copy(fontSize = 20.sp), color = SmapText)
                    Text("동화 ${stars}권 분량", style = SmapCaptionStyle, color = SmapMuted)
                }
                Column(
                    horizontalAlignment = Alignment.End,
                    verticalArrangement = Arrangement.spacedBy(2.dp),
                ) {
                    Text(price, style = SmapTitleStyle.copy(fontSize = 20.sp), color = SmapText)
                    if (perStar != null) {
                        Text(perStar, style = SmapBadgeStyle.copy(fontSize = 11.sp), color = SmapMuted)
                    }
                }
            }
            PrimaryButton(
                title = if (purchasing) "결제 중…" else "구매하기",
                variant = if (isHighlighted) PrimaryButtonVariant.Filled else PrimaryButtonVariant.Tonal,
                enabled = !anyPurchasing,
                isLoading = purchasing,
                onClick = onPurchase,
            )
        }
        // 우상단 ribbon 배지 — 카드 외곽으로 살짝 떠 카드 안쪽 정렬에 영향 주지 않음.
        meta?.badge?.let { badge ->
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(end = 16.dp)
                    .clip(CircleShape)
                    .background(SmapPrimary)
                    .padding(horizontal = 10.dp, vertical = 4.dp),
            ) {
                Text(
                    text = badge,
                    style = SmapBadgeStyle.copy(fontSize = 11.sp),
                    color = Color.White,
                )
            }
        }
    }
}

/** iOS policySection 패리티 — "결제 안내" 헤더 + 길게 설명 + SmapMutedBg 박스. */
@Composable
private fun PolicySection() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(SmapMutedBg, RoundedCornerShape(16.dp))
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Icon(
                imageVector = Icons.Filled.Info,
                contentDescription = null,
                tint = SmapMuted,
                modifier = Modifier.size(14.dp),
            )
            Text("결제 안내", style = SmapBadgeStyle.copy(fontSize = 13.sp), color = SmapMuted)
        }
        Text(
            text = "결제는 Google Play를 통해 안전하게 처리되며 영수증은 Google 계정 이메일로 발송됩니다. " +
                "별은 사용한 후에는 환불이 어려울 수 있고, 환불은 'Google Play → 계정 → 구매 기록'에서 신청합니다.",
            style = SmapCaptionStyle,
            color = SmapMuted,
        )
    }
}

@Composable
private fun LoadingBlock(message: String) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(vertical = 40.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        CircularProgressIndicator(color = SmapPrimary)
        Text(message, style = SmapBodyStyle, color = SmapMuted)
    }
}

/** iOS emptyError 패리티 — "wifi.exclamationmark" + "상품 정보를 불러올 수 없어요" + 재시도. */
@Composable
private fun EmptyError(message: String, onRetry: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(vertical = 24.dp, horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Icon(
            imageVector = Icons.Filled.SignalWifiOff,
            contentDescription = null,
            tint = SmapMuted,
            modifier = Modifier.size(40.dp),
        )
        Text(
            text = if (message.isBlank()) "상품 정보를 불러올 수 없어요" else message,
            style = SmapBodyStyle,
            color = SmapText,
            textAlign = TextAlign.Center,
        )
        PrimaryButton(
            title = "다시 불러오기",
            variant = PrimaryButtonVariant.Tonal,
            onClick = onRetry,
            modifier = Modifier.fillMaxWidth(0.7f),
        )
    }
}

@Composable
private fun GrantedToast(stars: Int) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(SmapPrimarySoft, RoundedCornerShape(14.dp))
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Icon(Icons.Filled.Star, contentDescription = null, tint = SmapPrimary)
        Spacer(Modifier.height(0.dp))
        Text("별 ${stars}개가 충전됐어요!", style = SmapBodyEmphasisStyle, color = SmapPrimaryForeground)
    }
}
