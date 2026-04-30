package site.smap.harubook.core.models

import kotlinx.serialization.Serializable

@Serializable
data class CreditBalance(
    val balance: Int,
    val totalPurchased: Int? = null,
)

@Serializable
data class CreditsResponse(val credits: CreditBalance)
