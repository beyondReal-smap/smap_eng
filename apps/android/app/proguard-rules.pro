# kotlinx.serialization 보존
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt

-keep,includedescriptorclasses class site.smap.harubook.**$$serializer { *; }
-keepclassmembers class site.smap.harubook.** {
    *** Companion;
}
-keepclasseswithmembers class site.smap.harubook.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# Ktor OkHttp 엔진
-keep class io.ktor.client.engine.okhttp.** { *; }
