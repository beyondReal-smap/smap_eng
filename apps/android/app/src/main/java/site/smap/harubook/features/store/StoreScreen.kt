package site.smap.harubook.features.store

import android.app.Activity
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.android.billingclient.api.ProductDetails
import site.smap.harubook.core.models.IAP_PRODUCT_STARS
import site.smap.harubook.designsystem.PrimaryButton
import site.smap.harubook.designsystem.PrimaryButtonVariant
import site.smap.harubook.designsystem.SmapBackground
import site.smap.harubook.designsystem.SmapBodyEmphasisStyle
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapCaptionStyle
import site.smap.harubook.designsystem.SmapDanger
import site.smap.harubook.designsystem.SmapHeadingStyle
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapPrimaryForeground
import site.smap.harubook.designsystem.SmapPrimarySoft
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText
import site.smap.harubook.designsystem.SmapTitleStyle

/**
 * 별 충전(IAP) — iOS StoreView 패리티. Play Billing v7 통합.
 *
 * Activity 컨텍스트가 필요한 `launchBillingFlow` 호출 때문에 본 화면은 Activity 안에서만 의미가 있다.
 * Compose 호스트가 ComponentActivity 라서 LocalContext.current 캐스팅으로 충분.
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
                .padding(horizontal = 24.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Hero()

            when {
                state.isConnecting && state.products.isEmpty() ->
                    LoadingBlock("결제 모듈을 준비 중이에요…")
                !state.errorMessage.isNullOrBlank() && state.products.isEmpty() ->
                    ErrorBlock(state.errorMessage.orEmpty(), viewModel::retryQueryProducts)
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
        }
    }
}

@Composable
private fun TopBar(onBack: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Icon(
            Icons.AutoMirrored.Filled.ArrowBack,
            contentDescription = "뒤로",
            tint = SmapText,
            modifier = Modifier.size(28.dp).clickable(onClick = onBack),
        )
        Text("별 충전", style = SmapTitleStyle, color = SmapText)
    }
}

@Composable
private fun Hero() {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Icon(
            Icons.Filled.Star,
            contentDescription = null,
            tint = SmapPrimary,
            modifier = Modifier
                .size(72.dp)
                .background(SmapPrimarySoft, RoundedCornerShape(percent = 50))
                .padding(12.dp),
        )
        Text(
            "필요한 만큼 충전해서 동화를 만들어 보세요.",
            style = SmapBodyStyle,
            color = SmapMuted,
            textAlign = TextAlign.Center,
        )
    }
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
    val stars = IAP_PRODUCT_STARS[product.productId] ?: 0

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(SmapSurface, RoundedCornerShape(18.dp))
            .border(1.dp, SmapBorder, RoundedCornerShape(18.dp))
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text(product.name.ifEmpty { "별 $stars" }, style = SmapHeadingStyle, color = SmapText)
                Text("별 ${stars}개", style = SmapCaptionStyle, color = SmapMuted)
            }
            Text(price, style = SmapHeadingStyle, color = SmapPrimaryForeground)
        }
        PrimaryButton(
            title = if (purchasing) "결제 중…" else "구매하기",
            enabled = !anyPurchasing,
            isLoading = purchasing,
            onClick = onPurchase,
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

@Composable
private fun ErrorBlock(message: String, onRetry: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(vertical = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(message, style = SmapBodyStyle, color = SmapDanger, textAlign = TextAlign.Center)
        PrimaryButton(
            title = "다시 시도",
            variant = PrimaryButtonVariant.Tonal,
            onClick = onRetry,
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
        Text("별 ${stars}개가 충전됐어요!", style = SmapBodyEmphasisStyle, color = SmapPrimaryForeground)
    }
}
