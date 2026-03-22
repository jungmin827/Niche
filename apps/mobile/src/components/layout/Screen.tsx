import { PropsWithChildren } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = PropsWithChildren<{
  scroll?: boolean;
  className?: string;
  contentClassName?: string;
}>;

export default function Screen({
  children,
  scroll = false,
  className = '',
  contentClassName = '',
}: Props) {
  if (scroll) {
    return (
      <SafeAreaView className={`flex-1 bg-white ${className}`} edges={['top']}>
        <ScrollView
          contentContainerClassName={`px-6 pb-12 pt-5 ${contentClassName}`}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 bg-white ${className}`} edges={['top']}>
      <View className={`flex-1 px-6 pb-12 pt-5 ${contentClassName}`}>{children}</View>
    </SafeAreaView>
  );
}
