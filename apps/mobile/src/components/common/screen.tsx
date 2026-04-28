import { ScrollView, StyleSheet, View, useWindowDimensions, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ScreenProps = ScrollViewProps;

export function Screen({ contentContainerStyle, style, children, ...props }: ScreenProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const viewportWidth = width > 0 ? width : 360;
  const contentMaxWidth = Math.min(MaxContentWidth, viewportWidth);

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: theme.background }, style]}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      {...props}>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.maxWidth, { maxWidth: contentMaxWidth }]}>{children}</View>
      </SafeAreaView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    alignItems: 'flex-start',
    paddingBottom: Spacing.four,
  },
  maxWidth: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
});
