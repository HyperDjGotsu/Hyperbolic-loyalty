import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useTheme } from '@/lib/theme-context';
import { PASS_TIERS, type PassTierKey } from '@/lib/pass-tiers';
import { AppText } from '@/components/kit';

// Bottom sheet comparing the passes. `currentTier` is highlighted as the player's own.
export function PassesSheet({ currentTier, onClose }: { currentTier: PassTierKey; onClose: () => void }) {
  const { colors } = useTheme();
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }} onPress={onClose} />
      <View style={{ maxHeight: '85%', backgroundColor: colors.bgSurface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 32 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <AppText variant="title">Passes</AppText>
          <Pressable onPress={onClose} hitSlop={10}><AppText variant="caption" tone="secondary" style={{ fontWeight: '700', fontSize: 14 }}>Close</AppText></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ gap: 12 }}>
          {PASS_TIERS.map(tier => {
            const current = tier.key === currentTier;
            return (
              <View key={tier.key} style={{ borderRadius: 18, padding: 16, borderWidth: 1, borderColor: current ? colors.accent : colors.border, backgroundColor: colors.bgElevated }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'baseline' }}>
                    <AppText variant="body" style={{ fontWeight: '700', fontSize: 16 }}>{tier.name}</AppText>
                    {current && <AppText variant="eyebrow" tone="accent">Your pass</AppText>}
                  </View>
                  <AppText variant="body" style={{ fontWeight: '700', fontSize: 16 }}>
                    {tier.priceMonthly === null ? 'Free' : `$${tier.priceMonthly}`}
                    {tier.priceMonthly !== null && <AppText variant="caption" tone="secondary">/mo</AppText>}
                  </AppText>
                </View>
                <View style={{ marginTop: 8, gap: 4 }}>
                  {tier.perks.map(p => <AppText key={p} variant="caption" tone="secondary" style={{ fontSize: 13, lineHeight: 18 }}>· {p}</AppText>)}
                </View>
              </View>
            );
          })}
          <AppText variant="caption" tone="secondary" style={{ textAlign: 'center', marginTop: 4 }}>Ask staff in the store to start or change your pass.</AppText>
        </ScrollView>
      </View>
    </Modal>
  );
}
