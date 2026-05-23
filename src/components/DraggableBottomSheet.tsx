import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  BackHandler,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type PanResponderGestureState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Return false to prevent dismiss (e.g. while saving). */
  onCloseStart?: () => void | boolean;
  children: ReactNode;
  dragZone?: ReactNode;
  partialRatio?: number;
  fullRatio?: number;
  backdropTestID?: string;
  /** Hold the overlay up after dismiss begins so the backdrop tap cannot reopen content below. */
  touchAbsorbMs?: number;
};

const DISMISS_VELOCITY = 0.75;
const DISMISS_HEIGHT_RATIO = 0.35;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function resolveSnapTarget(
  height: number,
  velocityY: number,
  partialHeight: number,
  fullHeight: number,
): 'partial' | 'full' | 'dismiss' {
  const dismissThreshold = partialHeight * DISMISS_HEIGHT_RATIO;

  if (height <= dismissThreshold || (velocityY > DISMISS_VELOCITY && height <= partialHeight)) {
    return 'dismiss';
  }

  if (velocityY < -DISMISS_VELOCITY) {
    return 'full';
  }

  if (velocityY > DISMISS_VELOCITY && height >= partialHeight * 0.9) {
    return height > (partialHeight + fullHeight) / 2 ? 'partial' : 'dismiss';
  }

  const midpoint = (partialHeight + fullHeight) / 2;
  if (height >= midpoint) return 'full';
  if (height >= partialHeight * 0.85) return 'partial';
  return 'dismiss';
}

export function DraggableBottomSheet({
  visible,
  onClose,
  onCloseStart,
  children,
  dragZone,
  partialRatio = 0.62,
  fullRatio = 0.94,
  backdropTestID = 'bottom-sheet-backdrop',
  touchAbsorbMs = 1200,
}: Props) {
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const partialHeight = screenHeight * partialRatio;
  const fullHeight = screenHeight * fullRatio - insets.top;
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const dragStartHeight = useRef(partialHeight);
  const partialHeightRef = useRef(partialHeight);
  const fullHeightRef = useRef(fullHeight);
  const onCloseRef = useRef(onClose);
  const onCloseStartRef = useRef(onCloseStart);
  const isClosingRef = useRef(false);
  const absorbTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(false);
  const [absorbingTouches, setAbsorbingTouches] = useState(false);

  partialHeightRef.current = partialHeight;
  fullHeightRef.current = fullHeight;
  onCloseRef.current = onClose;
  onCloseStartRef.current = onCloseStart;

  const animateTo = useCallback(
    (target: number, onComplete?: () => void) => {
      Animated.spring(animatedHeight, {
        toValue: target,
        useNativeDriver: false,
        damping: 28,
        stiffness: 280,
        mass: 0.9,
      }).start(({ finished }) => {
        if (finished) onComplete?.();
      });
    },
    [animatedHeight],
  );

  const dismiss = useCallback(() => {
    if (isClosingRef.current) return;
    if (onCloseStartRef.current?.() === false) return;
    isClosingRef.current = true;
    // Start absorbing touches immediately (Modal still open) and begin animation.
    // The Modal stays mounted for the full touchAbsorbMs, ensuring iOS cannot
    // deliver a deferred touch to the content behind it.
    setAbsorbingTouches(true);
    animateTo(0);
    if (absorbTimeoutRef.current) clearTimeout(absorbTimeoutRef.current);
    absorbTimeoutRef.current = setTimeout(() => {
      absorbTimeoutRef.current = null;
      onCloseRef.current();
    }, touchAbsorbMs);
  }, [animateTo, touchAbsorbMs]);

  const snapTo = useCallback(
    (target: 'partial' | 'full' | 'dismiss') => {
      if (target === 'dismiss') {
        dismiss();
        return;
      }

      const nextHeight = target === 'full' ? fullHeightRef.current : partialHeightRef.current;
      setScrollEnabled(target === 'full');
      animateTo(nextHeight);
    },
    [animateTo, dismiss],
  );

  const handleRelease = useCallback(
    (gesture: PanResponderGestureState) => {
      animatedHeight.stopAnimation((currentHeight) => {
        const target = resolveSnapTarget(
          currentHeight,
          gesture.vy,
          partialHeightRef.current,
          fullHeightRef.current,
        );
        snapTo(target);
      });
    },
    [animatedHeight, snapTo],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dy) > 2 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          animatedHeight.stopAnimation((value) => {
            dragStartHeight.current = value;
          });
        },
        onPanResponderMove: (_, gesture) => {
          const nextHeight = clamp(dragStartHeight.current - gesture.dy, 0, fullHeightRef.current);
          animatedHeight.setValue(nextHeight);
          setScrollEnabled(nextHeight >= fullHeightRef.current * 0.98);
        },
        onPanResponderRelease: (_, gesture) => {
          handleRelease(gesture);
        },
        onPanResponderTerminate: (_, gesture) => {
          handleRelease(gesture);
        },
      }),
    [animatedHeight, handleRelease],
  );

  useEffect(() => {
    isClosingRef.current = false;
    animatedHeight.setValue(0);
    const frame = requestAnimationFrame(() => {
      animateTo(partialHeightRef.current);
    });
    return () => {
      cancelAnimationFrame(frame);
      animatedHeight.stopAnimation();
      if (absorbTimeoutRef.current) {
        clearTimeout(absorbTimeoutRef.current);
        absorbTimeoutRef.current = null;
      }
    };
    // Open animation runs once per mount; parent unmounts this component on close.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      dismiss();
      return true;
    });
    return () => subscription.remove();
  }, [dismiss, visible]);

  const backdropOpacity = animatedHeight.interpolate({
    inputRange: [0, partialHeight],
    outputRange: [0, 0.38],
    extrapolate: 'clamp',
  });

  const bodyPadding = { paddingBottom: insets.bottom + 24 };

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible onRequestClose={dismiss} statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View
          pointerEvents="none"
          className="absolute inset-0 bg-[rgb(35,36,34)]"
          style={{ opacity: backdropOpacity }}
        />
        {/* Full-screen touch absorber is ALWAYS rendered — it catches the backdrop
          tap and any delayed / ghost touches. When not absorbing it sits below
          the sheet and only handles backdrop area. When absorbing (after dismiss
          starts) it covers everything so nothing leaks through. */}
        <Pressable
          className="absolute inset-0"
          style={styles.backdrop}
          onPressIn={absorbingTouches ? undefined : dismiss}
          testID={backdropTestID}
          accessibilityRole="button"
          accessibilityLabel="Close sheet"
        />
        <Animated.View
          className="overflow-hidden rounded-t-[24px] bg-paper"
          pointerEvents={absorbingTouches ? 'none' : 'auto'}
          style={[styles.sheet, { height: animatedHeight }]}
        >
          <View
            {...panResponder.panHandlers}
            className="pb-3 pt-5"
            style={{ minHeight: 64 }}
            accessibilityRole="adjustable"
            accessibilityHint="Drag up to expand, drag down to close"
            testID="bottom-sheet-drag-zone"
          >
            {dragZone}
          </View>
          {scrollEnabled ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              contentContainerStyle={bodyPadding}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={bodyPadding}>{children}</View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  sheet: {
    zIndex: 1,
  },
});
