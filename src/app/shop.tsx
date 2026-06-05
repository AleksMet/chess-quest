// TODO: ХАОС режим — restore full shop screen when Chaos mode is added
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useRunStore } from '../store/runStore';

export default function ShopScreen() {
  const router = useRouter();
  const { completeNode, currentNodeIndex } = useRunStore();
  useEffect(() => {
    completeNode(currentNodeIndex);
    router.replace('/adventure');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
