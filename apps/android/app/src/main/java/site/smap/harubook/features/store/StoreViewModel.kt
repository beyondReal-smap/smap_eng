package site.smap.harubook.features.store

import android.app.Activity
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.android.billingclient.api.ProductDetails
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import site.smap.harubook.core.billing.BillingManager
import site.smap.harubook.core.networking.ApiClient

data class StoreUiState(
    val products: List<ProductDetails> = emptyList(),
    val isConnecting: Boolean = true,
    val purchasingProductId: String? = null,
    val errorMessage: String? = null,
    val lastGrantedStars: Int? = null,
)

/**
 * iOS `StoreViewModel.swift` 미러.
 *
 * 흐름:
 *   1. init → BillingManager.connect()
 *   2. BillingManager.state.products 구독 → products UI
 *   3. purchase(activity, product) → BillingManager.launchPurchase
 *   4. BillingManager.purchaseEvents 구독 → 백엔드 검증 → consume
 */
class StoreViewModel : ViewModel() {
    private val _state = MutableStateFlow(StoreUiState())
    val state: StateFlow<StoreUiState> = _state.asStateFlow()

    init {
        BillingManager.connect()
        viewModelScope.launch {
            BillingManager.state.collect { billing ->
                _state.update {
                    it.copy(
                        products = billing.products,
                        isConnecting = !billing.isConnected,
                        errorMessage = billing.lastError ?: it.errorMessage,
                    )
                }
            }
        }
        viewModelScope.launch {
            BillingManager.purchaseEvents.collect { event ->
                when (event) {
                    is BillingManager.PurchaseEvent.Success -> verify(event.productId, event.purchaseToken)
                    BillingManager.PurchaseEvent.UserCancelled -> _state.update { it.copy(purchasingProductId = null) }
                    is BillingManager.PurchaseEvent.Failure -> _state.update {
                        it.copy(purchasingProductId = null, errorMessage = "결제에 실패했어요: ${event.message}")
                    }
                }
            }
        }
    }

    fun purchase(activity: Activity, product: ProductDetails) {
        _state.update { it.copy(purchasingProductId = product.productId, errorMessage = null) }
        BillingManager.launchPurchase(activity, product)
    }

    fun retryQueryProducts() {
        viewModelScope.launch { BillingManager.queryProducts() }
    }

    fun clearError() {
        _state.update { it.copy(errorMessage = null) }
    }

    fun consumeLastGrant() {
        _state.update { it.copy(lastGrantedStars = null) }
    }

    private suspend fun verify(productId: String, purchaseToken: String) {
        try {
            val response: VerifyResponse = ApiClient.post(
                path = "/api/iap/verify",
                body = VerifyRequest(
                    platform = "android",
                    productId = productId,
                    purchaseToken = purchaseToken,
                ),
            )
            // 검증 성공/멱등(이미 처리됨) 모두 consume 가능.
            BillingManager.consume(purchaseToken)
            if (response.granted && response.stars != null) {
                _state.update {
                    it.copy(
                        purchasingProductId = null,
                        lastGrantedStars = response.stars,
                        errorMessage = null,
                    )
                }
            } else {
                _state.update { it.copy(purchasingProductId = null) }
            }
        } catch (e: Throwable) {
            // 서버 검증 실패 — consume 하지 않는다. BillingClient 가 다음 시작 시 다시 발행.
            _state.update {
                it.copy(
                    purchasingProductId = null,
                    errorMessage = "결제 확인에 실패했어요. 잠시 후 다시 시도해 주세요.",
                )
            }
        }
    }
}

@Serializable
internal data class VerifyRequest(
    val platform: String,
    val productId: String,
    val purchaseToken: String,
)

@Serializable
internal data class VerifyResponse(
    val granted: Boolean = false,
    val balance: Int? = null,
    val stars: Int? = null,
    val idempotent: Boolean? = null,
    val productId: String? = null,
)
