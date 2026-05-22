import { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, View } from 'react-native';
import { composeWheelTimeValue, parseWheelTimeValue } from '../utils/time';

const wheelItemHeight = 34;
const wheelHeight = 182;
const hourOptions = Array.from({ length: 12 }, (_, index) => String(index + 1));
const minuteOptions = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0'));
const meridiemOptions = ['AM', 'PM'];

function WheelColumn({
  options,
  selectedValue,
  onChange,
  width,
  align = 'center',
  testID,
}: {
  options: string[];
  selectedValue: string;
  onChange: (value: string) => void;
  width: number;
  align?: 'left' | 'center' | 'right';
  testID?: string;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const momentumScrollingRef = useRef(false);
  const fallbackSelectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedIndex = Math.max(0, options.indexOf(selectedValue));
  const scrollY = useRef(new Animated.Value(selectedIndex * wheelItemHeight)).current;

  const applyScrollSelection = (offsetY: number | undefined) => {
    if (typeof offsetY !== 'number' || !Number.isFinite(offsetY)) return;

    const nextIndex = Math.round(offsetY / wheelItemHeight);
    const optionIndex = Math.max(0, Math.min(options.length - 1, nextIndex));
    const nextValue = options[optionIndex];
    if (nextValue) onChange(nextValue);
  };

  const clearFallbackSelection = () => {
    if (!fallbackSelectionTimeoutRef.current) return;
    clearTimeout(fallbackSelectionTimeoutRef.current);
    fallbackSelectionTimeoutRef.current = null;
  };

  const scheduleFallbackSelection = (offsetY: number | undefined) => {
    clearFallbackSelection();
    fallbackSelectionTimeoutRef.current = setTimeout(() => {
      fallbackSelectionTimeoutRef.current = null;
      applyScrollSelection(offsetY);
    }, 120);
  };

  useEffect(() => {
    scrollY.setValue(selectedIndex * wheelItemHeight);
    scrollRef.current?.scrollTo({
      y: selectedIndex * wheelItemHeight,
      animated: false,
    });
  }, [scrollY, selectedIndex]);

  useEffect(
    () => () => {
      clearFallbackSelection();
    },
    [],
  );

  return (
    <View style={{ width, height: wheelHeight }}>
      <Animated.ScrollView
        ref={scrollRef}
        testID={testID}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        snapToInterval={wheelItemHeight}
        decelerationRate="normal"
        bounces={false}
        overScrollMode="never"
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingVertical: (wheelHeight - wheelItemHeight) / 2,
          paddingHorizontal: 10,
        }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        onMomentumScrollBegin={() => {
          clearFallbackSelection();
          momentumScrollingRef.current = true;
        }}
        onScrollEndDrag={(event) => {
          const velocityY = event.nativeEvent.velocity?.y;
          if (
            momentumScrollingRef.current ||
            (typeof velocityY === 'number' && Math.abs(velocityY) > 0.01)
          ) {
            scheduleFallbackSelection(event.nativeEvent.contentOffset?.y);
            return;
          }
          applyScrollSelection(event.nativeEvent.contentOffset?.y);
        }}
        onMomentumScrollEnd={(event) => {
          clearFallbackSelection();
          momentumScrollingRef.current = false;
          applyScrollSelection(event.nativeEvent.contentOffset?.y);
        }}
      >
        {options.map((item, index) => {
          const itemOffset = index * wheelItemHeight;
          const inputRange = [
            itemOffset - wheelItemHeight * 3,
            itemOffset - wheelItemHeight * 2,
            itemOffset - wheelItemHeight,
            itemOffset,
            itemOffset + wheelItemHeight,
            itemOffset + wheelItemHeight * 2,
            itemOffset + wheelItemHeight * 3,
          ];
          const animatedOpacity = scrollY.interpolate({
            inputRange,
            outputRange: [0.18, 0.32, 0.55, 1, 0.55, 0.32, 0.18],
            extrapolate: 'clamp',
          });
          const animatedScale = scrollY.interpolate({
            inputRange,
            outputRange: [0.54, 0.75, 0.92, 1, 0.92, 0.75, 0.54],
            extrapolate: 'clamp',
          });
          const alignClass =
            align === 'right' ? 'items-end' : align === 'left' ? 'items-start' : 'items-center';
          return (
            <Pressable
              key={`${item}-${index}`}
              onPress={() => onChange(item)}
              style={{ height: wheelItemHeight, width: '100%', paddingHorizontal: 12 }}
              className={`${alignClass} justify-center`}
              hitSlop={{ top: 6, bottom: 6, left: 16, right: 16 }}
              testID={`onboarding-wheel-option-${item}`}
            >
              <Animated.Text
                className="font-medium text-ink"
                style={{
                  fontSize: 24,
                  opacity: animatedOpacity,
                  transform: [{ scale: animatedScale }],
                }}
              >
                {item}
              </Animated.Text>
            </Pressable>
          );
        })}
      </Animated.ScrollView>
    </View>
  );
}

type Props = {
  value: string | undefined;
  onChange: (value: string) => void;
  containerClassName?: string;
  width?: number;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
};

export function TimeWheelPicker({
  value,
  onChange,
  containerClassName = '',
  width,
  onInteractionStart,
  onInteractionEnd,
}: Props) {
  const parsed = parseWheelTimeValue(value);
  const pendingTimeRef = useRef(parsed);

  useEffect(() => {
    pendingTimeRef.current = parseWheelTimeValue(value);
  }, [value]);

  const updateTimePart = (part: 'hour' | 'minute' | 'meridiem', nextValue: string) => {
    const nextTime = {
      ...pendingTimeRef.current,
      [part]: nextValue,
    };
    pendingTimeRef.current = nextTime;
    onChange(composeWheelTimeValue(nextTime.hour, nextTime.minute, nextTime.meridiem));
  };

  return (
    <View
      className={`relative items-center ${containerClassName}`.trim()}
      style={{ height: wheelHeight, width }}
      onTouchStart={onInteractionStart}
      onTouchEnd={onInteractionEnd}
      onTouchCancel={onInteractionEnd}
      testID="onboarding-time-picker"
    >
      <View
        className="absolute left-0 right-0 rounded-[10px] bg-[rgba(35,36,34,0.04)]"
        style={{ top: (wheelHeight - 36) / 2, height: 36 }}
      />
      <View
        className="absolute left-0 right-0 flex-row items-center justify-center"
        style={{ height: wheelHeight }}
      >
        <WheelColumn
          options={hourOptions}
          selectedValue={parsed.hour}
          width={104}
          align="right"
          testID="onboarding-hour-wheel"
          onChange={(hour) => updateTimePart('hour', hour)}
        />
        <WheelColumn
          options={minuteOptions}
          selectedValue={parsed.minute}
          width={96}
          testID="onboarding-minute-wheel"
          onChange={(minute) => updateTimePart('minute', minute)}
        />
        <WheelColumn
          options={meridiemOptions}
          selectedValue={parsed.meridiem}
          width={108}
          align="left"
          testID="onboarding-meridiem-wheel"
          onChange={(meridiem) => updateTimePart('meridiem', meridiem)}
        />
      </View>
    </View>
  );
}
