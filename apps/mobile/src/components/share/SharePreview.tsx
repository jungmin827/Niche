import { ShareModel } from '../../features/share/types';
import NikeTemplate from './NikeTemplate';

type Props = {
  model: ShareModel;
  hasBackground?: boolean;
};

export default function SharePreview({ model, hasBackground = false }: Props) {
  return <NikeTemplate model={model} hasBackground={hasBackground} />;
}
