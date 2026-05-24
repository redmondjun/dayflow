import { useState } from 'react';
import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { Snackbar } from 'react-native-paper';
import EyeClosedIcon from '../assets/icons/eye-closed.svg';
import EyeOpenIcon from '../assets/icons/eye-open.svg';
import TrashIcon from '../assets/icons/trash.svg';
import type { AiProvider } from '../hooks/useSettingsState';
import { StickyBottomBar } from '../components/StickyBottomBar';
import { colors } from '../theme/colors';
import { maskApiKey } from '../utils/maskApiKey';

export type SettingsViewProps = {
  aiFeaturesEnabled: boolean;
  aiSuggestionEnabled: boolean;
  currentApiKey: string;
  deleteDemoDayTasks: () => void | Promise<void>;
  demoDate: string;
  demoNowOverride: string | null;
  demoTime: string;
  deletingDemoTasks: boolean;
  message: string | null;
  onCancel?: () => void;
  onOpenPreviewCatalog?: () => void;
  onOpenWeeklyInsight?: () => void;
  onResetOnboarding: () => void | Promise<void>;
  removeCurrentProviderKey: () => void | Promise<void>;
  resetDemoTime: () => void;
  saveAllSettings: () => void | Promise<void>;
  saveCurrentProviderKey: () => void | Promise<void>;
  saveDemoTime: () => boolean;
  savedCurrentApiKey: string | null;
  savingCurrentKey: boolean;
  savingSettings: boolean;
  selectedProvider: AiProvider;
  setAiFeaturesEnabled: (value: boolean) => void;
  setAiSuggestionEnabled: (value: boolean) => void;
  setCurrentApiKey: (value: string) => void;
  setDemoDate: (value: string) => void;
  setDemoTime: (value: string) => void;
  setMessage: (value: string | null) => void;
  setSelectedProvider: (provider: AiProvider) => void;
  showDeveloperTools: boolean;
  toggleWeeklyPreview: (value: boolean) => void;
  weeklyPreviewEnabled: boolean;
};

function SettingsSectionHeader({ label }: { label: string }) {
  return (
    <Text className="mb-2.5 pl-1 text-[11px] font-medium uppercase tracking-[1.76px] text-warm2">
      {label}
    </Text>
  );
}

function AiProviderTabBar({
  selectedProvider,
  onSelect,
}: {
  selectedProvider: AiProvider;
  onSelect: (provider: AiProvider) => void;
}) {
  return (
    <View className="mb-3 flex-row overflow-hidden rounded-full border border-warm3">
      <Pressable
        onPress={() => onSelect('google')}
        className={`flex-1 items-center px-2.5 py-2.5 ${
          selectedProvider === 'google' ? 'bg-warm4' : 'bg-paper'
        } rounded-l-full border-r border-warm3`}
      >
        <Text
          className={`text-[15px] font-semibold ${
            selectedProvider === 'google' ? 'text-ink' : 'text-warm'
          }`}
        >
          Google
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onSelect('openai')}
        className={`flex-1 items-center px-2.5 py-2.5 ${
          selectedProvider === 'openai' ? 'bg-warm4' : 'bg-paper'
        } rounded-r-full`}
      >
        <Text
          className={`text-[15px] font-semibold ${
            selectedProvider === 'openai' ? 'text-ink' : 'text-warm'
          }`}
        >
          OpenAI
        </Text>
      </Pressable>
    </View>
  );
}

function SettingsToggleRow({
  title,
  subtitle,
  value,
  onValueChange,
  testID,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  testID?: string;
}) {
  return (
    <View className="min-h-14 flex-row items-center justify-between rounded-2xl border-[1.5px] border-warm3 px-[18px]">
      <View className="flex-1 pr-3">
        <Text className="text-[15px] tracking-[-0.15px] text-ink">{title}</Text>
        <Text className="mt-0.5 text-xs tracking-[-0.12px] text-warm">{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        testID={testID}
        trackColor={{ false: 'rgba(120,120,128,0.22)', true: colors.accent }}
        thumbColor={colors.white}
        ios_backgroundColor="rgba(120,120,128,0.22)"
      />
    </View>
  );
}

function ApiKeyEditor({
  currentApiKey,
  providerPlaceholder,
  providerHelpText,
  savedCurrentApiKey,
  savingCurrentKey,
  selectedProvider,
  onChangeKey,
  onRemoveKey,
  onSaveKey,
}: {
  currentApiKey: string;
  providerPlaceholder: string;
  providerHelpText: string;
  savedCurrentApiKey: string | null;
  savingCurrentKey: boolean;
  selectedProvider: AiProvider;
  onChangeKey: (value: string) => void;
  onRemoveKey: () => void | Promise<void>;
  onSaveKey: () => void | Promise<void>;
}) {
  const [showInput, setShowInput] = useState(false);
  const canSaveKey = currentApiKey.trim().length > 0;

  return (
    <View className="overflow-hidden rounded-2xl border-[1.5px] border-warm3 bg-paper">
      <View className="px-4 pb-3.5 pt-3.5">
        <View className="flex-row items-center gap-2">
          <View className="min-w-0 flex-1 flex-row items-center gap-2 rounded-[10px] border border-warm3 bg-warm4 px-3 py-2.5">
            <TextInput
              value={currentApiKey}
              onChangeText={onChangeKey}
              secureTextEntry={!showInput}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={providerPlaceholder}
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
            onPress={onSaveKey}
            disabled={!canSaveKey || savingCurrentKey}
            className={`rounded-full px-4 py-2.5 ${
              canSaveKey && !savingCurrentKey ? 'bg-accent' : 'bg-warm'
            }`}
          >
            <Text
              className={`text-[13px] font-semibold ${
                canSaveKey && !savingCurrentKey ? 'text-white' : 'text-warm2'
              }`}
            >
              Save
            </Text>
          </Pressable>
        </View>

        <Text className="mt-3 text-xs tracking-[-0.12px] text-warm">{providerHelpText}</Text>
      </View>

      <View className="mx-4 h-px bg-warm3" />

      {savedCurrentApiKey ? (
        <View className="flex-row items-center gap-2 px-4 py-3.5">
          <View className="h-[7px] w-[7px] rounded-full bg-accent" />
          <Text numberOfLines={1} className="flex-1 text-[13px] tracking-[0.52px] text-ink">
            {maskApiKey(savedCurrentApiKey)}
          </Text>
          <Pressable
            onPress={onRemoveKey}
            disabled={savingCurrentKey}
            className="h-[30px] w-[30px] items-center justify-center rounded-full border border-warm3"
          >
            <TrashIcon width={15} height={15} color={colors.warm} />
          </Pressable>
        </View>
      ) : (
        <View className="flex-row items-center gap-1.5 px-4 py-4">
          <View className="h-[7px] w-[7px] rounded-full bg-warm3" />
          <Text className="text-xs tracking-[-0.12px] text-warm">
            No saved keys - add one above
          </Text>
        </View>
      )}
    </View>
  );
}

function DeveloperToolsSection({
  deleteDemoDayTasks,
  demoDate,
  demoNowOverride,
  demoTime,
  deletingDemoTasks,
  onOpenPreviewCatalog,
  onOpenWeeklyInsight,
  onResetOnboarding,
  resetDemoTime,
  saveDemoTime,
  setDemoDate,
  setDemoTime,
  toggleWeeklyPreview,
  weeklyPreviewEnabled,
}: Pick<
  SettingsViewProps,
  | 'deleteDemoDayTasks'
  | 'demoDate'
  | 'demoNowOverride'
  | 'demoTime'
  | 'deletingDemoTasks'
  | 'onOpenPreviewCatalog'
  | 'onOpenWeeklyInsight'
  | 'onResetOnboarding'
  | 'resetDemoTime'
  | 'saveDemoTime'
  | 'setDemoDate'
  | 'setDemoTime'
  | 'toggleWeeklyPreview'
  | 'weeklyPreviewEnabled'
>) {
  return (
    <View className="mt-8 border-t border-warm3 pt-6">
      <SettingsSectionHeader label="Developer" />
      <View className="overflow-hidden rounded-2xl border-[1.5px] border-warm3 bg-paper px-[18px] py-4">
        <Text className="text-[15px] tracking-tight text-ink">Demo time</Text>
        <Text className="mt-1 text-xs tracking-tight text-warm">
          {demoNowOverride
            ? 'Override active for in-app schedule behavior'
            : 'Using live device time'}
        </Text>
        <View className="mt-4 flex-row gap-2">
          <TextInput
            value={demoDate}
            onChangeText={setDemoDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.warm2}
            autoCapitalize="none"
            autoCorrect={false}
            testID="settings-demo-date-input"
            className="min-w-0 flex-1 rounded-[10px] border border-warm3 bg-warm4 px-3 py-2.5 text-[13px] text-ink"
          />
          <TextInput
            value={demoTime}
            onChangeText={setDemoTime}
            placeholder="HH:MM"
            placeholderTextColor={colors.warm2}
            autoCapitalize="none"
            autoCorrect={false}
            testID="settings-demo-time-input"
            className="w-24 rounded-[10px] border border-warm3 bg-warm4 px-3 py-2.5 text-[13px] text-ink"
          />
        </View>
        <View className="mt-3 flex-row gap-2">
          <Pressable
            onPress={saveDemoTime}
            testID="settings-save-demo-time-button"
            className="flex-1 items-center rounded-full bg-ink px-4 py-3"
          >
            <Text className="text-[13px] font-semibold text-white">Set Demo Time</Text>
          </Pressable>
          <Pressable
            onPress={resetDemoTime}
            testID="settings-reset-demo-time-button"
            className="flex-1 items-center rounded-full border border-warm3 px-4 py-3"
          >
            <Text className="text-[13px] font-semibold text-ink">Reset</Text>
          </Pressable>
        </View>
      </View>

      <View className="mt-3 overflow-hidden rounded-2xl border-[1.5px] border-warm3 px-[18px] py-4">
        <Text className="text-[15px] tracking-tight text-ink">Delete demo day tasks</Text>
        <Text className="mt-1 text-xs tracking-tight text-warm">
          Removes all tasks scheduled on the demo date above
        </Text>
        <Pressable
          onPress={deleteDemoDayTasks}
          disabled={deletingDemoTasks}
          testID="settings-delete-demo-tasks-button"
          className={`mt-3 items-center rounded-full px-4 py-3 ${
            deletingDemoTasks ? 'bg-warm3' : 'border border-danger'
          }`}
        >
          <Text
            className={`text-[13px] font-semibold ${
              deletingDemoTasks ? 'text-warm2' : 'text-danger'
            }`}
          >
            {deletingDemoTasks ? 'Deleting...' : 'Delete Task Data'}
          </Text>
        </Pressable>
      </View>

      <View className="mt-3">
        <SettingsToggleRow
          title="Weekly demo data"
          subtitle={
            weeklyPreviewEnabled
              ? 'Weekly tab uses preview insight content'
              : 'Weekly tab uses live task history'
          }
          value={weeklyPreviewEnabled}
          onValueChange={toggleWeeklyPreview}
          testID="settings-weekly-preview-switch"
        />
      </View>

      {onOpenWeeklyInsight ? (
        <Pressable
          onPress={onOpenWeeklyInsight}
          testID="settings-open-weekly-preview-button"
          className="mt-3 items-center rounded-full border border-warm3 px-4 py-3"
        >
          <Text className="text-[13px] font-semibold text-ink">Open Weekly Insight</Text>
        </Pressable>
      ) : null}

      <Pressable
        onPress={onResetOnboarding}
        testID="settings-reset-onboarding-button"
        className="mt-3 items-center rounded-full border border-warm3 px-4 py-3"
      >
        <Text className="text-[13px] font-semibold text-ink">Reset Onboarding</Text>
      </Pressable>

      {onOpenPreviewCatalog ? (
        <Pressable
          onPress={onOpenPreviewCatalog}
          testID="settings-open-preview-catalog-button"
          className="mt-3 items-center rounded-full border border-warm3 px-4 py-3"
        >
          <Text className="text-[13px] font-semibold text-ink">UI Preview</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function SettingsView(props: SettingsViewProps) {
  const {
    aiFeaturesEnabled,
    aiSuggestionEnabled,
    currentApiKey,
    message,
    onCancel,
    removeCurrentProviderKey,
    saveCurrentProviderKey,
    savedCurrentApiKey,
    savingCurrentKey,
    savingSettings,
    selectedProvider,
    setAiFeaturesEnabled,
    setAiSuggestionEnabled,
    setCurrentApiKey,
    setMessage,
    setSelectedProvider,
    showDeveloperTools,
  } = props;

  const providerPlaceholder = selectedProvider === 'openai' ? 'sk-proj-...' : 'AIza...';
  const providerHelpText =
    selectedProvider === 'openai'
      ? 'GPT usage is billed by your OpenAI account.'
      : 'Gemini usage is billed by your Google account.';

  return (
    <View className="flex-1 bg-paper">
      <ScrollView contentContainerClassName="px-6 pb-28 pt-16">
        {onCancel ? (
          <Pressable onPress={onCancel} className="mb-7 h-11 w-11 items-start justify-center">
            <Text className="text-[28px] leading-none text-ink">‹</Text>
          </Pressable>
        ) : null}

        <Text
          className={`${onCancel ? 'mt-0' : 'mt-9'} mb-9 text-[30px] font-bold tracking-[-0.9px] text-ink`}
        >
          Setting
        </Text>

        <SettingsSectionHeader label="AI" />

        <AiProviderTabBar selectedProvider={selectedProvider} onSelect={setSelectedProvider} />

        <ApiKeyEditor
          currentApiKey={currentApiKey}
          providerPlaceholder={providerPlaceholder}
          providerHelpText={providerHelpText}
          savedCurrentApiKey={savedCurrentApiKey}
          savingCurrentKey={savingCurrentKey}
          selectedProvider={selectedProvider}
          onChangeKey={setCurrentApiKey}
          onRemoveKey={removeCurrentProviderKey}
          onSaveKey={saveCurrentProviderKey}
        />

        <View className="h-2.5" />

        <SettingsToggleRow
          title="AI Features"
          subtitle={aiFeaturesEnabled ? 'Schedule suggestions on' : 'Schedule suggestions off'}
          value={aiFeaturesEnabled}
          onValueChange={setAiFeaturesEnabled}
        />

        <View className="h-2.5" />

        <SettingsToggleRow
          title="AI Suggestion"
          subtitle={
            aiSuggestionEnabled ? 'Weekly insight suggestions on' : 'Weekly insight suggestions off'
          }
          value={aiSuggestionEnabled}
          onValueChange={setAiSuggestionEnabled}
          testID="settings-ai-suggestion-switch"
        />

        {savingCurrentKey ? (
          <Text className="mt-4 text-sm text-warm">Checking your API key...</Text>
        ) : null}

        {showDeveloperTools ? <DeveloperToolsSection {...props} /> : null}
      </ScrollView>

      <StickyBottomBar bordered>
        <Pressable
          onPress={props.saveAllSettings}
          disabled={savingSettings}
          testID="settings-save-all-button"
          className={`items-center rounded-full px-4 py-3.5 ${
            savingSettings ? 'bg-warm3' : 'bg-accent'
          }`}
        >
          <Text className={`text-[13px] font-bold ${savingSettings ? 'text-warm2' : 'text-white'}`}>
            {savingSettings ? 'Saving...' : 'Save'}
          </Text>
        </Pressable>
      </StickyBottomBar>

      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage(null)} duration={3000}>
        {message}
      </Snackbar>
    </View>
  );
}
