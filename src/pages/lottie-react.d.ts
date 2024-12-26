// lottie-react.d.ts
import { AnimationItem } from '@lottie-animation-community/lottie-types';

declare module 'lottie-react' {
  import { ComponentType } from 'react';

  interface LottieOptions {
    animationData: any; // or more specific type if you know the structure
    loop?: boolean;
    autoplay?: boolean;
    [key: string]: any; // For other props not listed here
  }

  interface LottieProps {
    options?: LottieOptions;
    eventListeners?: Array<{ eventName: string; callback: (e: any) => void }>;
  }

  const Lottie: ComponentType<LottieProps>;
  export default Lottie;
}