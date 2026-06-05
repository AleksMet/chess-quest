// TODO: ХАОС режим — restore full artifact-selection screen when Chaos mode is added
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function ArtifactSelectionScreen() {
  const router = useRouter();
  useEffect(() => { router.replace('/adventure'); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
