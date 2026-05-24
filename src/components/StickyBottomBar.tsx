import type { ReactNode } from 'react';
import { View } from 'react-native';

type Props = {
  children: ReactNode;
  bordered?: boolean;
  className?: string;
};

export function StickyBottomBar({ children, bordered = false, className }: Props) {
  return (
    <View
      className={`absolute bottom-0 left-0 right-0 bg-paper ${bordered ? 'border-t border-warm3' : ''} ${className ?? 'px-6 pb-6 pt-3'}`}
    >
      {children}
    </View>
  );
}
