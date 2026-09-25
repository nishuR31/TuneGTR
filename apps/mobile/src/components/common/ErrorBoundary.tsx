import React, { Component, ErrorInfo, ReactNode } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { clearStaleCache } from "../../utils/cacheCleanup";

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
      return (
        <ScrollView
          contentContainerStyle={styles.container}
          bounces={false}
        >
          <View style={styles.iconCircle}>
            <Feather name="zap" size={28} color="#D97706" />
          </View>
          <Text style={styles.title}>App Hit a Snag</Text>
          <Text style={styles.subtitle}>
            {this.props.fallbackMessage ??
              "An unexpected error occurred. Cache has been cleared."}
          </Text>
          {this.state.error?.message ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{this.state.error.message}</Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={styles.button}
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
    backgroundColor: "#F0F2F8",
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(113,120,212,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#7178D4",
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
    color: "#252B3A",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7491",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: "rgba(212,122,122,0.10)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 24,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(212,122,122,0.22)",
  },
  errorText: {
    color: "#D47A7A",
    fontSize: 12,
    fontFamily: "monospace",
  },
  button: {
    backgroundColor: "#7178D4",
    paddingHorizontal: 32,
    paddingVertical: 15,
    borderRadius: 28,
    shadowColor: "#7178D4",
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
