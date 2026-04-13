import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Animated,
  Easing,
} from "react-native";
import { styles } from "../styles";

export function GlassCard({ title, children, style }) {
  return (
    <View style={[styles.card, style]}>
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function PillButton({ label, onPress, variant = "primary", accessibilityLabel }) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel || label}
      onPress={onPress}
      style={({ pressed }) => [styles.pill, variant === "primary" ? styles.pillPrimary : styles.pillSecondary, pressed ? { opacity: 0.72, transform: [{ scale: 0.985 }] } : null]}
    >
      <Text style={variant === "primary" ? styles.pillTextPrimary : styles.pillTextSecondary}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active ? styles.chipActive : null]}>
      <Text style={active ? styles.chipTextActive : styles.chipText}>{label}</Text>
    </Pressable>
  );
}

export function TabButton({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={({ pressed }) => [styles.tabBtn, active ? styles.tabBtnActive : null, pressed ? { opacity: 0.75 } : null]}>
      <Text style={active ? styles.tabTextActive : styles.tabText}>{label}</Text>
    </Pressable>
  );
}

export function HeaderBar({ title, right }) {
  return (<View style={styles.rowBetween}><Text style={styles.h1}>{title}</Text>{right || null}</View>);
}

export function ListEmpty({ text }) {
  return <Text style={styles.muted}>{text}</Text>;
}

export function RowButton({ label, onPress, variant = "secondary", accessibilityLabel }) {
  return <PillButton label={label} onPress={onPress} variant={variant} accessibilityLabel={accessibilityLabel} />;
}

export function ToastBanner({ toast }) {
  if (!toast?.text) return null;
  return (
    <View style={[styles.toastWrap, toast.type === "error" ? styles.toastError : toast.type === "success" ? styles.toastSuccess : null]}>
      <Text style={styles.toastText}>{toast.text}</Text>
    </View>
  );
}

export function CelebrationOverlay({ visible }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: visible ? 1 : 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [visible, anim]);
  if (!visible) return null;
  return (
    <Animated.View style={[styles.celebrationOverlay, { opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }]}>
      <View style={styles.celebrationCard}><Text style={styles.h1}>Done</Text><Text style={styles.help}>Workout complete</Text></View>
    </Animated.View>
  );
}

export function GlowTextInput({ style, ...props }) {
  const focus = useRef(new Animated.Value(0)).current;
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    Animated.timing(focus, { toValue: focused ? 1 : 0, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [focused, focus]);
  const borderColor = focus.interpolate({ inputRange: [0, 1], outputRange: ["rgba(0,0,0,0.08)", "rgba(48,118,255,0.42)"] });
  return (
    <View style={{ position: "relative" }}>
      <Animated.View pointerEvents="none" style={[styles.glowBlobBlue, { opacity: focus }]} />
      <Animated.View pointerEvents="none" style={[styles.glowBlobGreen, { opacity: focus.interpolate({ inputRange: [0, 1], outputRange: [0, 0.7] }) }]} />
      <Animated.View style={[styles.inputGlowWrap, { borderColor }, style]}>
        <TextInput {...props} onFocus={(e) => { setFocused(true); props.onFocus?.(e); }} onBlur={(e) => { setFocused(false); props.onBlur?.(e); }} style={[styles.input, { borderWidth: 0, backgroundColor: "transparent", paddingHorizontal: 0, paddingVertical: 0 }, props.multiline ? { minHeight: 44, textAlignVertical: "top" } : null]} />
      </Animated.View>
    </View>
  );
}

export function PulsePressable({ children, onPress, style }) {
  const scale = useRef(new Animated.Value(1)).current;
  function doPress() {
    Animated.sequence([Animated.timing(scale, { toValue: 0.95, duration: 70, useNativeDriver: true }), Animated.spring(scale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true })]).start();
    onPress?.();
  }
  return (<Pressable onPress={doPress}><Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View></Pressable>);
}
