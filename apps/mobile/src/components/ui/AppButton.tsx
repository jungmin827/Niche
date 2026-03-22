import { Pressable, PressableProps, View } from 'react-native';
import AppText from './AppText';

type Props = PressableProps & {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  fullWidth?: boolean;
};

const variantClassMap = {
  primary: 'bg-[#111111] border border-[#111111]',
  secondary: 'bg-white border border-[#111111]',
  ghost: 'bg-transparent border border-[#D9D9D4]',
} as const;

const textColorMap = {
  primary: 'inverse' as const,
  secondary: 'primary' as const,
  ghost: 'primary' as const,
};

export default function AppButton({
  label,
  variant = 'primary',
  fullWidth = true,
  className = '',
  disabled,
  ...props
}: Props & { className?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      className={`min-h-[52px] rounded-[4px] px-5 py-[14px] ${variantClassMap[variant]} ${
        fullWidth ? 'w-full' : ''
      } ${disabled ? 'opacity-50' : ''} ${className}`}
      disabled={disabled}
      {...props}
    >
      <View className="items-center justify-center">
        <AppText variant="button" color={textColorMap[variant]} className="tracking-[0.2px]">
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}
