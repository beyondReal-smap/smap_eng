package site.smap.harubook.core.auth

import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64

/**
 * iOS `PKCE.swift` 미러. RFC 7636 — code_verifier(43~128자) + code_challenge(SHA-256/base64url).
 *
 * 안드로이드 SDK의 `android.util.Base64` 대신 `java.util.Base64` 를 사용한다. 후자는 minSdk 26
 * 이상에서 동작하며 JVM 단위 테스트에서도 그대로 사용할 수 있어 검증이 쉬워진다.
 */
object PKCE {
    private const val VERIFIER_LENGTH = 64
    private val encoder: Base64.Encoder = Base64.getUrlEncoder().withoutPadding()

    fun generateVerifier(): String {
        val bytes = ByteArray(VERIFIER_LENGTH).also { SecureRandom().nextBytes(it) }
        return encoder.encodeToString(bytes)
    }

    fun challenge(verifier: String): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(verifier.toByteArray(Charsets.US_ASCII))
        return encoder.encodeToString(digest)
    }
}
