package site.smap.harubook.features.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapCaptionStyle
import site.smap.harubook.designsystem.SmapDanger
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText

/** iOS LoginView/EmailLoginView/EmailSignupView 의 `labeledField` 헬퍼 미러. */
@Composable
internal fun LabeledField(
    label: String,
    placeholder: String,
    value: String,
    onValueChange: (String) -> Unit,
    keyboardType: KeyboardType,
    isSecure: Boolean,
    modifier: Modifier = Modifier,
    error: String? = null,
) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(label, style = SmapCaptionStyle, color = SmapMuted)
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            singleLine = true,
            visualTransformation = if (isSecure) PasswordVisualTransformation() else VisualTransformation.None,
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
            textStyle = SmapBodyStyle.copy(color = SmapText),
            modifier = Modifier
                .fillMaxWidth()
                .background(SmapSurface, RoundedCornerShape(12.dp))
                .border(
                    width = 1.dp,
                    color = if (error != null) SmapDanger else SmapBorder,
                    shape = RoundedCornerShape(12.dp),
                )
                .padding(horizontal = 14.dp, vertical = 14.dp),
            decorationBox = { inner ->
                if (value.isEmpty()) Text(placeholder, style = SmapBodyStyle, color = SmapMuted)
                inner()
            },
        )
        if (!error.isNullOrBlank()) {
            Text(error, style = SmapCaptionStyle, color = SmapDanger)
        }
    }
}
