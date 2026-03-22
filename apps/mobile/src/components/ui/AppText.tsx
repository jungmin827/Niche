import { Text, TextProps } from 'react-native';

type Variant = 'hero' | 'title' | 'body' | 'bodySmall' | 'caption' | 'button';
type Color = 'primary' | 'inverse';

type Props = TextProps & {
  variant?: Variant;
  color?: Color;
};

const variantClassMap: Record<Variant, string> = {
  hero: 'text-[32px] leading-[38px] font-medium',
  title: 'text-[20px] leading-[26px] font-medium',
  body: 'text-[16px] leading-[24px] font-normal',
  bodySmall: 'text-[14px] leading-[20px] font-normal',
  caption: 'text-[12px] leading-[18px] font-normal',
  button: 'text-[15px] leading-[20px] font-bold',
};

const colorClassMap: Record<Color, string> = {
  primary: 'text-black',
  inverse: 'text-white',
};

export default function AppText({
  variant = 'body',
  color = 'primary',
  className = '',
  ...props
}: Props & { className?: string }) {
  return (
    <Text
      className={`${variantClassMap[variant]} ${colorClassMap[color]} ${className}`}
      {...props}
    />
  );
}
