import { useFonts } from 'expo-font';
export function useStoryFonts() {
  return useFonts({
    'Story-classic': require('../../../../assets/story-fonts/classic.ttf'),
    'Story-signature': require('../../../../assets/story-fonts/signature.ttf'),
    'Story-neon': require('../../../../assets/story-fonts/neon.ttf'),
    'Story-typewriter': require('../../../../assets/story-fonts/typewriter.ttf'),
    'Story-cyberpunk': require('../../../../assets/story-fonts/cyberpunk.ttf'),
    'Story-poster': require('../../../../assets/story-fonts/poster.ttf'),
  });
}
