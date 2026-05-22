import { useState } from 'react';
import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Snackbar } from 'react-native-paper';
import EyeClosedIcon from '../assets/icons/eye-closed.svg';
import EyeOpenIcon from '../assets/icons/eye-open.svg';
import TrashIcon from '../assets/icons/trash.svg';
import { useSettingsState } from '../hooks/useSettingsState';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type RouteProps = NativeStackScreenProps<RootStackParamList, 'Settings'>;

type EmbeddedProps = {
  onCancel?: () => void;
  onOpenPreviewCatalog?: () => void;
};

type Props = RouteProps | EmbeddedProps;

type ApiKeySectionProps = {
  provider: string;
  placeholder: string;
  value: string;
  savedKey: string | null;
  loading: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  onRemove: () => void;
};

function isRouteProps(props: Props): props is RouteProps {
  return 'navigation' in props;
}

function maskKey(value: string) {
  if (value.length <= 12) return '•'.repeat(value.length);
  return `${value.slice(0, 6)}  •••••••••••••  ${value.slice(-4)}`;
}

function SectionHeader({ label }: { label: string }) {
  return (
    <Text className="mb-2.5 pl-1 text-[11px] font-medium uppercase tracking-[2px] text-warm2">
      {label}
    </Text>
  );
}

function ApiKeySection({
  provider,
  placeholder,
  value,
  savedKey,
  loading,
  onChange,
  onSave,
  onRemove,
}: ApiKeySectionProps) {
  const [showInput, setShowInput] = useState(false);
  const canSave = value.trim().length > 0;

  return (
    <View className="overflow-hidden rounded-2xl border border-warm3 bg-paper">
      <View className="px-4 pb-3.5 pt-3.5">
        <Text className="mb-3 text-[11px] font-medium uppercase tracking-[1.7px] text-warm">
          {provider} API Key
        </Text>
        <View className="flex-row items-center gap-2">
          <View className="flex-1 flex-row items-center gap-2 rounded-[10px] border border-warm3 bg-warm3/35 px-3 py-2.5">
            <TextInput
              value={value}
              onChangeText={onChange}
              secureTextEntry={!showInput}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={placeholder}
              placeholderTextColor={colors.warm2}
              className="min-w-0 flex-1 text-[13px] text-ink"
            />
            <Pressable onPress={() => setShowInput((current) => !current)}>
              {showInput ? (
                <EyeOpenIcon width={18} height={18} color={colors.warm2} />
              ) : (
                <EyeClosedIcon width={18} height={18} color={colors.warm2} />
              )}
            </Pressable>
          </View>

          <Pressable
            onPress={onSave}
            disabled={!canSave || loading}
            className={`rounded-full px-4 py-2.5 ${
              canSave && !loading ? 'bg-[#3EAF44]' : 'bg-warm3'
            }`}
          >
            <Text
              className={`text-[13px] font-semibold ${
                canSave && !loading ? 'text-white' : 'text-warm2'
              }`}
            >
              Save
            </Text>
          </Pressable>
        </View>
      </View>

      {savedKey ? (
        <>
          <View className="mx-4 h-px bg-warm3" />
          <View className="px-4 pb-1 pt-2">
            <Text className="pb-2 text-[11px] font-medium uppercase tracking-[1.7px] text-warm2">
              Saved keys
            </Text>
            <View className="flex-row items-center gap-2 py-2.5">
              <View className="h-[7px] w-[7px] rounded-full bg-[#3EAF44]" />
              <Text numberOfLines={1} className="flex-1 text-[13px] tracking-[0.5px] text-ink">
                {maskKey(savedKey)}
              </Text>
              <Pressable
                onPress={onRemove}
                disabled={loading}
                className="h-[30px] w-[30px] items-center justify-center rounded-full border border-warm3"
              >
                <TrashIcon width={15} height={15} color={colors.warm} />
              </Pressable>
            </View>
          </View>
        </>
      ) : (
        <View className="flex-row items-center gap-2 px-4 pb-3.5">
          <View className="h-1.5 w-1.5 rounded-full bg-warm3" />
          <Text className="text-xs text-warm">No saved keys — add one above</Text>
        </View>
      )}
    </View>
  );
}

export function SettingsScreen(props: Props) {
  const {
    aiFeaturesEnabled,
    apiKeySections,
    message,
    setMessage,
    toggleAiFeatures,
    validatingOpenAi,
  } = useSettingsState();
  const onCancel = isRouteProps(props) ? () => props.navigation.goBack() : props.onCancel;
  const onOpenPreviewCatalog = isRouteProps(props)
    ? __DEV__
      ? () => props.navigation.navigate('PreviewCatalog')
      : undefined
    : props.onOpenPreviewCatalog;

  return (
    <View className="flex-1 bg-paper">
      <ScrollView contentContainerClassName="px-6 pb-12 pt-16">
        {onCancel ? (
          <Pressable onPress={onCancel} className="mb-7 h-11 w-11 items-start justify-center">
            <Text className="text-[28px] leading-none text-ink">‹</Text>
          </Pressable>
        ) : null}

        <Text
          className={`${onCancel ? 'mt-0' : 'mt-9'} mb-9 text-[30px] font-bold tracking-tight text-ink`}
        >
          Settings
        </Text>

        <SectionHeader label="AI" />
        {apiKeySections.map((section, index) => (
          <View key={section.id}>
            <ApiKeySection {...section} />
            {index < apiKeySections.length - 1 ? <View className="h-2.5" /> : null}
          </View>
        ))}

        <View className="h-2.5" />

        <View className="overflow-hidden rounded-2xl border border-warm3">
          <View className="min-h-14 flex-row items-center justify-between px-[18px]">
            <View className="flex-1 pr-3">
              <Text className="text-[15px] tracking-tight text-ink">AI Features</Text>
              <Text className="mt-0.5 text-xs tracking-tight text-warm">
                {aiFeaturesEnabled ? 'Schedule suggestions on' : 'Schedule suggestions off'}
              </Text>
            </View>
            <Switch
              value={aiFeaturesEnabled}
              onValueChange={toggleAiFeatures}
              trackColor={{ false: 'rgba(120,120,128,0.22)', true: '#3EAF44' }}
              thumbColor={colors.white}
              ios_backgroundColor="rgba(120,120,128,0.22)"
            />
          </View>
        </View>

        {validatingOpenAi ? (
          <Text className="mt-4 text-sm text-warm">Checking your OpenAI API key...</Text>
        ) : null}

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

      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage(null)} duration={3000}>
        {message}
      </Snackbar>
    </View>
  );
}
