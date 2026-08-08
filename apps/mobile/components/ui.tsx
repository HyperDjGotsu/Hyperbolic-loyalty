import { ActivityIndicator, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { C } from '@/lib/theme';

// ─── LoadingView ─────────────────────────────────────────────────────────────
// Full-screen centered spinner. Use in every screen's loading state.
export function LoadingView({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.center, style]}>
      <ActivityIndicator color={C.accent} size="large" />
    </View>
  );
}

// ─── ErrorView ───────────────────────────────────────────────────────────────
export function ErrorView({ message, style }: { message: string; style?: ViewStyle }) {
  return (
    <View style={[styles.center, style]}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

// ─── SectionCard ─────────────────────────────────────────────────────────────
// Standard surface card: bg-surface, border, borderRadius 16.
export function SectionCard({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
}

// ─── SectionTitle ────────────────────────────────────────────────────────────
// Section heading used before a card group.
export function SectionTitle({ children, style }: { children: string; style?: TextStyle }) {
  return (
    <Text style={[styles.sectionTitle, style]}>{children}</Text>
  );
}

// ─── XPBar ───────────────────────────────────────────────────────────────────
// Horizontal XP progress bar with left/right labels.
export function XPBar({
  progress,
  leftLabel,
  rightLabel,
}: {
  progress: number; // 0–1
  leftLabel: string;
  rightLabel: string;
}) {
  const pct = `${Math.min(100, Math.round(progress * 100))}%` as `${number}%`;
  return (
    <View>
      <View style={styles.xpTrack}>
        <View style={[styles.xpFill, { width: pct }]} />
      </View>
      <View style={styles.xpLabelRow}>
        <Text style={styles.xpLabel}>{leftLabel}</Text>
        <Text style={styles.xpLabel}>{rightLabel}</Text>
      </View>
    </View>
  );
}

// ─── StatRow ─────────────────────────────────────────────────────────────────
// Three-column stat row with dividers. Each cell: label + value.
export type StatCell = { label: string; value: string | number; accent?: boolean };

export function StatRow({ cells }: { cells: [StatCell, StatCell, StatCell] }) {
  return (
    <View style={styles.statRow}>
      {cells.map((cell, i) => (
        <View key={i} style={[styles.statCell, i === 1 && styles.statCellMiddle]}>
          <Text style={styles.statLabel}>{cell.label}</Text>
          <Text style={[styles.statValue, cell.accent && styles.statValueAccent]}>
            {typeof cell.value === 'number' ? cell.value.toLocaleString() : cell.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────
export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />;
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.bgBase,
  },
  errorText: {
    color: C.danger,
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: C.bgSurface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  sectionTitle: {
    color: C.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  xpTrack: {
    height: 6,
    backgroundColor: C.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    backgroundColor: C.accent,
    borderRadius: 3,
  },
  xpLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  xpLabel: {
    fontSize: 10,
    color: C.textTertiary,
  },
  statRow: {
    flexDirection: 'row',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statCellMiddle: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: C.border,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: C.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: C.textPrimary,
    marginTop: 2,
  },
  statValueAccent: {
    color: C.accent,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 12,
  },
});
