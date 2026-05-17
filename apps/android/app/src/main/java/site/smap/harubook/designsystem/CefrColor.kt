package site.smap.harubook.designsystem

import androidx.compose.ui.graphics.Color
import site.smap.harubook.core.models.CefrLevel

/** iOS CefrLevel.color extension 미러. */
val CefrLevel.tint: Color
    get() = when (this) {
        CefrLevel.A1 -> SmapLevelA1
        CefrLevel.A2 -> SmapLevelA2
        CefrLevel.B1 -> SmapLevelB1
        CefrLevel.B2 -> SmapLevelB2
    }
