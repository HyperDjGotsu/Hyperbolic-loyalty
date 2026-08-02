import { getDefaultConfig } from './configs';
import PitchContent from './PitchContent';

export default function PitchPage() {
  return <PitchContent cfg={getDefaultConfig()} />;
}
