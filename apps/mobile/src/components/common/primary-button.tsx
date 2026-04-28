import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

interface PrimaryButtonProps extends PressableProps {
  label: string;
  variant?: 'solid' | 'soft';
}

export function PrimaryButton({ label, variant = 'solid', style, disabled, ...props }: PrimaryButtonProps) {
  const theme = useTheme();
  const solid = variant === 'solid';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={(state) => [
        styles.button,
        {
          backgroundColor: solid ? theme.accent : theme.backgroundElement,
          borderColor: solid ? theme.goldDeep : theme.border,
          opacity: disabled ? 0.45 : state.pressed ? 0.76 : 1,
        },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    shadowColor: '#C46E00',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
  },
});
