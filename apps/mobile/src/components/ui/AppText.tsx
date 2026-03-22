import { Text, TextProps } from 'react-native';

type Variant = 'hero' | 'title' | 'body' | 'button';
type Color = 'primary' | 'inverse';

type Props = TextProps & {
  variant?: Variant;
  color?: Color;
};

const variantClassMap: Record<Variant, string> = {
  hero: 'text-[32px] leading-[38px] font-medium',
  title: 'text-[20px] leading-[26px] font-medium',
  body: 'text-[16px] leading-[24px] font-normal',
  button: 'text-[16px] leading-[20px] font-medium',
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
