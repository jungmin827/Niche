import { PropsWithChildren } from 'react';
import { View } from 'react-native';

export default function AppCard({
  children,
  className = '',
}: PropsWithChildren<{ className?: string }>) {
  return (
    <View className={`rounded-[20px] border border-[#D9D9D4] bg-white p-6 ${className}`}>
      {children}
    </View>
  );
}
