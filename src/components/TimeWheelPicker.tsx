import { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, View } from 'react-native';
import { composeWheelTimeValue, parseWheelTimeValue } from '../utils/time';

const defaultWheelItemHeight = 34;
const defaultWheelHeight = 182;
const defaultWheelHighlightHeight = 36;
const defaultWheelTextSize = 24;
const hourOptions = Array.from({ length: 12 }, (_, index) => String(index + 1));
const minuteOptions = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0'));
const meridiemOptions = ['AM', 'PM'];

function WheelColumn({
  options,
  selectedValue,
  onChange,
  onInteractionStart,
  onInteractionEnd,
  width,
  itemHeight,
  height,
  textSize,
  align = 'center',
  testID,
}: {
  options: string[];
  selectedValue: string;
  onChange: (value: string) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  width: number;
  itemHeight: number;
  height: number;
  textSize: number;
  align?: 'left' | 'center' | 'right';
  testID?: string;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const momentumScrollingRef = useRef(false);
  const fallbackSelectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedIndex = Math.max(0, options.indexOf(selectedValue));
  const scrollY = useRef(new Animated.Value(selectedIndex * itemHeight)).current;

  const applyScrollSelection = (offsetY: number | undefined) => {
    if (typeof offsetY !== 'number' || !Number.isFinite(offsetY)) return;

    const nextIndex = Math.round(offsetY / itemHeight);
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
    scrollY.setValue(selectedIndex * itemHeight);
    scrollRef.current?.scrollTo({
      y: selectedIndex * itemHeight,
      animated: false,
    });
  }, [scrollY, selectedIndex, itemHeight]);

  useEffect(
    () => () => {
      clearFallbackSelection();
    },
    [],
  );

  return (
    <View style={{ width, height }}>
      <Animated.ScrollView
        ref={scrollRef}
        testID={testID}
        style={{ flex: 1 }}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="normal"
        bounces={false}
        overScrollMode="never"
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingVertical: (height - itemHeight) / 2,
          paddingHorizontal: 10,
        }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        onMomentumScrollBegin={() => {
          clearFallbackSelection();
          momentumScrollingRef.current = true;
        }}
        onScrollBeginDrag={() => {
          onInteractionStart?.();
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
          onInteractionEnd?.();
          applyScrollSelection(event.nativeEvent.contentOffset?.y);
        }}
        onMomentumScrollEnd={(event) => {
          clearFallbackSelection();
          momentumScrollingRef.current = false;
          onInteractionEnd?.();
          applyScrollSelection(event.nativeEvent.contentOffset?.y);
        }}
      >
        {options.map((item, index) => {
          const itemOffset = index * itemHeight;
          const inputRange = [
            itemOffset - itemHeight * 3,
            itemOffset - itemHeight * 2,
            itemOffset - itemHeight,
            itemOffset,
            itemOffset + itemHeight,
            itemOffset + itemHeight * 2,
            itemOffset + itemHeight * 3,
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
              style={{ height: itemHeight, width: '100%', paddingHorizontal: 12 }}
              className={`${alignClass} justify-center`}
              hitSlop={{ top: 6, bottom: 6, left: 16, right: 16 }}
              testID={`onboarding-wheel-option-${item}`}
            >
              <Animated.Text
                className="font-medium text-ink"
                style={{
                  fontSize: textSize,
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
  wheelHeight?: number;
  wheelItemHeight?: number;
  highlightHeight?: number;
  textSize?: number;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
};

export function TimeWheelPicker({
  value,
  onChange,
  containerClassName = '',
  width,
  wheelHeight = defaultWheelHeight,
  wheelItemHeight = defaultWheelItemHeight,
  highlightHeight = defaultWheelHighlightHeight,
  textSize = defaultWheelTextSize,
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
        style={{ top: (wheelHeight - highlightHeight) / 2, height: highlightHeight }}
      />
      <View
        className="absolute left-0 right-0 flex-row items-center justify-center"
        style={{ height: wheelHeight }}
      >
        <WheelColumn
          options={hourOptions}
          selectedValue={parsed.hour}
          onInteractionStart={onInteractionStart}
          onInteractionEnd={onInteractionEnd}
          itemHeight={wheelItemHeight}
          height={wheelHeight}
          textSize={textSize}
          width={104}
          align="right"
          testID="onboarding-hour-wheel"
          onChange={(hour) => updateTimePart('hour', hour)}
        />
        <WheelColumn
          options={minuteOptions}
          selectedValue={parsed.minute}
          onInteractionStart={onInteractionStart}
          onInteractionEnd={onInteractionEnd}
          itemHeight={wheelItemHeight}
          height={wheelHeight}
          textSize={textSize}
          width={96}
          testID="onboarding-minute-wheel"
          onChange={(minute) => updateTimePart('minute', minute)}
        />
        <WheelColumn
          options={meridiemOptions}
          selectedValue={parsed.meridiem}
          onInteractionStart={onInteractionStart}
          onInteractionEnd={onInteractionEnd}
          itemHeight={wheelItemHeight}
          height={wheelHeight}
          textSize={textSize}
          width={108}
          align="left"
          testID="onboarding-meridiem-wheel"
          onChange={(meridiem) => updateTimePart('meridiem', meridiem)}
        />
      </View>
    </View>
  );
}
