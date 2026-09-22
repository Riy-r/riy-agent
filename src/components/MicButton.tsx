/**
 * MicButton.tsx
 * ---------------------------------------------------------------------------
 * The BIG microphone button. Tap once to start recording (the halo pulses),
 * tap again to stop and send your voice to the agent.
 *
 * Props are intentionally simple so you can restyle freely:
 *   recording  - are we currently recording?
 *   disabled   - grey out during thinking/transcribing
 *   onPress    - what to do when tapped
 */

import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/constants/theme";

type Props = {
  recording: boolean;
  busy: boolean;
  onPress: () => void;
};

export function MicButton({ recording, busy, onPress }: Props) {
  // 0 -> 1 -> 0 loop drives the pulsing halo while recording.
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!recording) {
      pulse.setValue(0);
      return;
    }
    // Loop the pulse only while recording.
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [recording, pulse]);

  return (
    <View style={styles.wrap}>
      {/* Pulsing halo (only visible while recording) */}
      {recording && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.halo,
            {
              opacity: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.5, 0],
              }),
              transform: [
                {
                  scale: pulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.9],
                  }),
                },
              ],
            },
          ]}
        />
      )}

      <Pressable
        onPress={onPress}
        disabled={busy}
        style={({ pressed }) => [
          styles.button,
          recording && styles.buttonRecording,
          busy && styles.buttonDisabled,
          pressed && styles.buttonPressed,
        ]}
        accessibilityRole="button"
        accessibilityState={{ busy }}
      >
        <Ionicons name={recording ? "stop" : "mic"} size={38} color={theme.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  halo: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: theme.radiusFull,
    backgroundColor: theme.accent,
  },
  button: {
    width: 88,
    height: 88,
    borderRadius: theme.radiusFull,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.primary,
    elevation: 8,
    shadowColor: theme.primary,
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
  },
  buttonRecording: {
    backgroundColor: theme.accent,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    transform: [{ scale: 0.96 }],
  },
});
