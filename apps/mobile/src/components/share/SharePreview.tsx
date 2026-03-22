import { ShareModel } from '../../features/share/types';
import ShareTemplateA from './ShareTemplateA';
import ShareTemplateB from './ShareTemplateB';

type Props = {
  model: ShareModel;
};

export default function SharePreview({ model }: Props) {
  if (model.templateCode === 'mono_story_v2') {
    return <ShareTemplateB model={model} />;
  }

  return <ShareTemplateA model={model} />;
}
