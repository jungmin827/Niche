import { forwardRef } from 'react';
import { TextInput, TextInputProps, View } from 'react-native';
import AppText from './AppText';

type Props = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string;
};

const AppInput = forwardRef<TextInput, Props>(function AppInput(
  { label, hint, error, className = '', multiline, textAlignVertical, ...props },
  ref,
) {
  return (
    <View className="gap-2">
      {label ? (
        <AppText variant="caption" className="text-[#555555] tracking-[0.2px]">
          {label}
        </AppText>
      ) : null}
      <TextInput
        ref={ref}
        className={`min-h-[54px] rounded-[16px] border border-[#D9D9D4] bg-[#F6F6F4] px-5 py-4 text-[16px] leading-[24px] text-black ${className}`}
        multiline={multiline}
        placeholderTextColor="#8A8A84"
        textAlignVertical={textAlignVertical ?? (multiline ? 'top' : 'center')}
        {...props}
      />
      {error ? (
        <AppText variant="caption" className="text-[#555555]">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" className="text-[#8A8A84]">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});

export default AppInput;
