import type { ReactNode } from 'react';
import { View } from 'react-native';

const connectorColor = 'rgba(35,36,34,0.10)';

type Props = {
  isFirst: boolean;
  isLast: boolean;
  children: ReactNode;
};

export function TimelineConnector({ isFirst, isLast, children }: Props) {
  return (
    <View className="w-14 items-center">
      <View
        style={{
          position: 'absolute',
          top: 0,
          height: '50%',
          width: 2,
          backgroundColor: isFirst ? 'transparent' : connectorColor,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: '50%',
          height: '50%',
          width: 2,
          backgroundColor: isLast ? 'transparent' : connectorColor,
        }}
      />
      <View className="absolute top-1/2 -translate-y-1/2">{children}</View>
    </View>
  );
}
