import { Pressable, ScrollView, Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import { colors } from '../theme/colors';

type Props = {
  onEditProfile?: () => void;
  onOpenSettings: () => void;
  onOpenPreviewCatalog?: () => void;
};

function MyPageRow({
  label,
  description,
  onPress,
}: {
  label: string;
  description?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="min-h-16 flex-row items-center justify-between rounded-2xl border border-warm3 bg-paper px-[18px] py-4"
    >
      <View className="min-w-0 flex-1 pr-4">
        <Text className="text-[15px] tracking-tight text-ink">{label}</Text>
        {description ? (
          <Text className="mt-0.5 text-xs tracking-tight text-warm">{description}</Text>
        ) : null}
      </View>
      <Text className="text-xl text-warm">›</Text>
    </Pressable>
  );
}

export function MyPageScreen({ onEditProfile, onOpenSettings, onOpenPreviewCatalog }: Props) {
  return (
    <View className="flex-1 bg-paper">
      <ScrollView contentContainerClassName="px-6 pb-12 pt-16">
        <Text className="mb-9 mt-9 text-[30px] font-bold tracking-tight text-ink">My Page</Text>

        <View className="gap-2.5">
          {onEditProfile ? (
            <MyPageRow
              label="Edit Onboarding Profile"
              description="Update your daily rhythm and planning preferences."
              onPress={onEditProfile}
            />
          ) : null}

          <MyPageRow
            label="Settings"
            description="Manage API keys and AI feature preferences."
            onPress={onOpenSettings}
          />
        </View>

        {onOpenPreviewCatalog ? (
          <View className="mt-8 border-t border-warm3 pt-6">
            <Text className="text-xs font-semibold uppercase tracking-[2px] text-warm">
              Developer
            </Text>
            <Button
              mode="outlined"
              onPress={onOpenPreviewCatalog}
              textColor={colors.ink}
              style={{ marginTop: 12, borderRadius: 999 }}
            >
              UI Preview
            </Button>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
