import React, { Component, ErrorInfo, ReactNode } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Appearance,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { clearStaleCache } from "../../utils/cacheCleanup";
import { clayLightColors, clayDarkColors } from "../../theme/clay";

interface Props {
  children?: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — catches React render errors and shows a recovery UI.
 * On reset, clears stale AsyncStorage cache to prevent loop crashes.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
  }

  private handleReset = async () => {
    await clearStaleCache();
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      const isDark = Appearance.getColorScheme() === 'dark';
      const colors = isDark ? clayDarkColors : clayLightColors;

      return (
        <ScrollView
          contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
          bounces={false}
        >
          <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(113,120,212,0.2)' : 'rgba(113,120,212,0.12)' }]}>
            <Feather name="zap" size={28} color={colors.accent} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>App Hit a Snag</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {this.props.fallbackMessage ??
              "An unexpected error occurred. Cache has been cleared."}
          </Text>
          {this.state.error?.message ? (
            <View style={[styles.errorBox, { backgroundColor: isDark ? 'rgba(212,122,122,0.15)' : 'rgba(212,122,122,0.10)', borderColor: isDark ? 'rgba(212,122,122,0.3)' : 'rgba(212,122,122,0.22)' }]}>
              <Text style={[styles.errorText, { color: colors.error }]}>{this.state.error.message}</Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.accent, shadowColor: colors.accent }]}
            onPress={this.handleReset}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Clear Cache & Reload</Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  iconText: {
    fontSize: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 16,
  },
  errorBox: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 24,
    width: "100%",
    borderWidth: 1,
  },
  errorText: {
    fontSize: 12,
    fontFamily: "monospace",
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 15,
    borderRadius: 28,
    shadowOffset: { width: 2, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 7,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
