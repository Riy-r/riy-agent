/**
 * MessageBubble.tsx
 * ---------------------------------------------------------------------------
 * One chat message. Colors tell you who spoke:
 *   - violet bubble on the right  = the user
 *   - dark bubble on the left     = the agent
 *
 * RTL support: each bubble detects whether ITS text is Arabic and flips
 * direction/alignment for that message only. This means a chat can mix
 * English and Arabic messages and both look correct.
 */

import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "@/constants/theme";
import { isArabic } from "@/utils/sanitize";
import type { ChatMessage } from "@/services/memory";

type Props = { message: ChatMessage };

function MessageBubbleBase({ message }: Props) {
  const isUser = message.role === "user";
  const textIsArabic = isArabic(message.content);
  const textAlign = textIsArabic ? "right" : "left";

  return (
    <View
      style={[
        styles.row,
        // Flip the whole row position for Arabic vs English.
        isUser ? styles.rowEnd : styles.rowStart,
      ]}
    >
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAgent]}>
        <Text
          style={[
            styles.text,
            textAlign === "right" ? styles.textRtl : null,
            { textAlign },
          ]}
        >
          {message.content}
        </Text>
        <Text style={[styles.time, { textAlign }]}>
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row", // never flip: we control alignment manually
    marginBottom: theme.sm,
    paddingHorizontal: theme.sm,
  },
  rowEnd: { justifyContent: "flex-end" },
  rowStart: { justifyContent: "flex-start" },

  bubble: {
    maxWidth: "85%",
    borderRadius: theme.radius,
    paddingHorizontal: theme.md,
    paddingVertical: theme.sm + 2,
  },
  bubbleUser: {
    backgroundColor: theme.bubbleUser,
    borderBottomRightRadius: 4, // "tail" hint
  },
  bubbleAgent: {
    backgroundColor: theme.bubbleAgent,
    borderBottomLeftRadius: 4, // "tail" hint
  },

  text: {
    color: theme.text,
    fontSize: 15.5,
    lineHeight: 22,
  },
  textRtl: {
    writingDirection: "rtl", // correct Arabic glyph shaping + wrapping
  },

  time: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 10.5,
    marginTop: 4,
  },
});

// Memo = re-render only when THIS message changes (smooth long chats).
export const MessageBubble = memo(MessageBubbleBase);
