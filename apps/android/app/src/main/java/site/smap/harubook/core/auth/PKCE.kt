package site.smap.harubook.core.auth

import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64

/**
 * RFC 7636 PKCE (S256 only).
 *
 * - `verifier`: base64url 무패딩, 32 byte → 43자
 * - `challenge`: base64url(SHA-256(verifier))
 *
 * `java.util.Base64`(JDK 8+, Android API 26+)를 사용해 단위 테스트가 JVM에서도 동작한다.
 */
object PKCE {
    private val URL_ENCODER: Base64.Encoder = Base64.getUrlEncoder().withoutPadding()

    fun generateVerifier(byteLength: Int = 32): String {
        require(byteLength in 32..96) { "PKCE verifier byte length out of range" }
        val bytes = ByteArray(byteLength).also(SecureRandom()::nextBytes)
        return URL_ENCODER.encodeToString(bytes)
    }

    fun challenge(verifier: String): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(verifier.toByteArray(Charsets.UTF_8))
        return URL_ENCODER.encodeToString(digest)
    }
}
