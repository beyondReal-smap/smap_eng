package site.smap.harubook.features.createbook

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import site.smap.harubook.designsystem.SmapBackground
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapCaptionStyle
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText
import site.smap.harubook.designsystem.SmapTitleStyle

@Composable
fun GenrePickerStep(onSelect: (CreateBookViewModel.Genre) -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SmapBackground)
            .padding(horizontal = 24.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("어떤 책을 만들까요?", style = SmapTitleStyle, color = SmapText)
            Text("이야기는 상상력을, 정보책은 새로운 지식을 키워줘요.", style = SmapBodyStyle, color = SmapMuted)
        }
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            CreateBookViewModel.Genre.entries.forEach { genre ->
                GenreCard(genre = genre, onClick = { onSelect(genre) })
            }
        }
    }
}

@Composable
private fun GenreCard(genre: CreateBookViewModel.Genre, onClick: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .background(SmapSurface, RoundedCornerShape(18.dp))
            .border(1.dp, SmapBorder, RoundedCornerShape(18.dp))
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Text(genre.label, style = SmapTitleStyle, color = SmapText)
        Text(genre.description, style = SmapCaptionStyle, color = SmapMuted)
    }
}
