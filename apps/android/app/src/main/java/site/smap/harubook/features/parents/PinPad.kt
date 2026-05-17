package site.smap.harubook.features.parents

import androidx.compose.animation.core.Animatable
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapSurface

private const val PIN_LENGTH = 4

/**
 * 4자리 숫자 PIN 패드. 숨겨진 BasicTextField + 4 셀.
 * 4자리 도달 시 [onComplete] 호출. [shakeToken] 변경 시 흔들기.
 */
@Composable
fun PinPad(
    value: String,
    onValueChange: (String) -> Unit,
    onComplete: (String) -> Unit,
    shakeToken: Int = 0,
) {
    val focusRequester = remember { FocusRequester() }
    val shakeOffset = remember { Animatable(0f) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) { focusRequester.requestFocus() }

    LaunchedEffect(shakeToken) {
        if (shakeToken == 0) return@LaunchedEffect
        val sequence = listOf(-12f, 12f, -8f, 8f, -4f, 0f)
        for (offset in sequence) {
            shakeOffset.animateTo(offset, animationSpec = androidx.compose.animation.core.tween(50))
        }
    }

    Box(contentAlignment = Alignment.Center) {
        BasicTextField(
            value = value,
            onValueChange = { newValue ->
                val digits = newValue.filter(Char::isDigit).take(PIN_LENGTH)
                onValueChange(digits)
                if (digits.length == PIN_LENGTH) onComplete(digits)
            },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
            modifier = Modifier.focusRequester(focusRequester).size(1.dp),
        )

        Row(
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            modifier = Modifier
                .offset { IntOffset(shakeOffset.value.toInt(), 0) }
                .clickable { scope.launch { focusRequester.requestFocus() } },
        ) {
            for (i in 0 until PIN_LENGTH) {
                Cell(filled = i < value.length, active = i == value.length)
            }
        }
    }
}

@Composable
private fun Cell(filled: Boolean, active: Boolean) {
    Box(
        modifier = Modifier
            .width(56.dp)
            .height(64.dp)
            .background(SmapSurface, RoundedCornerShape(14.dp))
            .border(
                width = if (active) 2.dp else 1.dp,
                color = if (active) SmapPrimary else SmapBorder,
                shape = RoundedCornerShape(14.dp),
            ),
        contentAlignment = Alignment.Center,
    ) {
        if (filled) {
            Box(modifier = Modifier.size(16.dp).background(SmapPrimary, CircleShape))
        }
    }
}
