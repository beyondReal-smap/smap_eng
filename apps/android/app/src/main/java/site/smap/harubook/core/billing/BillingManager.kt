package site.smap.harubook.core.billing

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.ConsumeParams
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/**
 * Google Play Billing v7 래퍼. iOS StoreKit 2 ViewModel 패리티.
 *
 * 흐름:
 *   1. [init] + [connect] → BillingClient 시작
 *   2. [queryProducts] → ProductDetails 3개 로드(small/medium/large)
 *   3. [launchPurchase] → Activity 에서 billing flow 시작
 *   4. PurchasesUpdatedListener → ack + consume → [purchaseEvents] 발행
 *   5. 외부에서 purchaseEvents 구독해 백엔드 검증 + UI 응답
 *
 * Consumable 정책: 검증 성공 후 consumeAsync 호출(재구매 가능). acknowledge 는 consume 이
 * 자동 처리해 별도 호출 안 함(공식 가이드).
 */
@SuppressLint("StaticFieldLeak")
object BillingManager {
    val PRODUCT_IDS = listOf(
        "com.smap.harubook.star_small",
        "com.smap.harubook.star_medium",
        "com.smap.harubook.star_large",
    )

    private lateinit var appContext: Context
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private var client: BillingClient? = null

    private val _state = MutableStateFlow(State())
    val state: StateFlow<State> = _state.asStateFlow()

    /** 구매 결과 이벤트(검증 대상 purchase + product id). 호출자가 백엔드로 보내 검증. */
    private val _purchaseEvents = MutableSharedFlow<PurchaseEvent>(extraBufferCapacity = 8)
    val purchaseEvents: SharedFlow<PurchaseEvent> = _purchaseEvents.asSharedFlow()

    data class State(
        val isConnected: Boolean = false,
        val products: List<ProductDetails> = emptyList(),
        val lastError: String? = null,
    )

    sealed class PurchaseEvent {
        data class Success(val productId: String, val purchaseToken: String) : PurchaseEvent()
        data object UserCancelled : PurchaseEvent()
        data class Failure(val message: String) : PurchaseEvent()
    }

    private val updateListener = PurchasesUpdatedListener { result, purchases ->
        if (result.responseCode == BillingClient.BillingResponseCode.OK && purchases != null) {
            purchases.forEach(::handlePurchase)
        } else if (result.responseCode == BillingClient.BillingResponseCode.USER_CANCELED) {
            _purchaseEvents.tryEmit(PurchaseEvent.UserCancelled)
        } else {
            _purchaseEvents.tryEmit(PurchaseEvent.Failure(result.debugMessage))
        }
    }

    fun init(context: Context) {
        if (::appContext.isInitialized) return
        appContext = context.applicationContext
    }

    fun connect() {
        if (client != null) return
        val c = BillingClient.newBuilder(appContext)
            .setListener(updateListener)
            .enablePendingPurchases(
                PendingPurchasesParams.newBuilder()
                    .enableOneTimeProducts()
                    .build(),
            )
            .build()
        client = c
        c.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                    _state.value = _state.value.copy(isConnected = true, lastError = null)
                    scope.launch { queryProducts() }
                } else {
                    _state.value = _state.value.copy(
                        isConnected = false,
                        lastError = "결제 모듈을 초기화하지 못했어요(${result.responseCode}).",
                    )
                }
            }

            override fun onBillingServiceDisconnected() {
                _state.value = _state.value.copy(isConnected = false)
            }
        })
    }

    suspend fun queryProducts() {
        val c = client ?: return
        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(
                PRODUCT_IDS.map { id ->
                    QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(id)
                        .setProductType(BillingClient.ProductType.INAPP)
                        .build()
                },
            )
            .build()

        suspendCancellableCoroutine<Unit> { cont ->
            c.queryProductDetailsAsync(params) { result, list ->
                if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                    val sorted = list.sortedBy {
                        it.oneTimePurchaseOfferDetails?.priceAmountMicros ?: Long.MAX_VALUE
                    }
                    _state.value = _state.value.copy(products = sorted, lastError = null)
                } else {
                    _state.value = _state.value.copy(
                        lastError = "상품 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
                    )
                }
                cont.resume(Unit)
            }
        }
    }

    fun launchPurchase(activity: Activity, product: ProductDetails) {
        val c = client ?: return
        val params = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(
                listOf(
                    BillingFlowParams.ProductDetailsParams.newBuilder()
                        .setProductDetails(product)
                        .build(),
                ),
            )
            .build()
        c.launchBillingFlow(activity, params)
    }

    private fun handlePurchase(purchase: Purchase) {
        if (purchase.purchaseState != Purchase.PurchaseState.PURCHASED) return
        val productId = purchase.products.firstOrNull() ?: return
        _purchaseEvents.tryEmit(PurchaseEvent.Success(productId, purchase.purchaseToken))
    }

    /**
     * 백엔드 검증 성공 시 호출 — Consumable 은 consume 해야 재구매 가능.
     * 실패 시(미네트워크 등) BillingClient 가 다음 시작 시 재발행한다.
     */
    fun consume(purchaseToken: String) {
        val c = client ?: return
        val params = ConsumeParams.newBuilder().setPurchaseToken(purchaseToken).build()
        c.consumeAsync(params) { _, _ -> /* 결과는 무시 — 실패 시 다음 시작 때 재시도. */ }
    }

    /** 멱등 응답(이미 처리된 거래) 시에도 큐에서 제거하기 위해 acknowledge — Consumable 이 아닌 케이스 대비. */
    @Suppress("unused")
    fun acknowledge(purchaseToken: String) {
        val c = client ?: return
        val params = AcknowledgePurchaseParams.newBuilder()
            .setPurchaseToken(purchaseToken)
            .build()
        c.acknowledgePurchase(params) { _ -> }
    }
}

