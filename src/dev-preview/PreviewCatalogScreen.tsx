import { Pressable, ScrollView, Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { previewScenarios } from './scenarios';

type Props = NativeStackScreenProps<RootStackParamList, 'PreviewCatalog'>;

export function PreviewCatalogScreen({ navigation }: Props) {
  return (
    <View className="flex-1 bg-paper">
      <ScrollView contentContainerClassName="pb-8 pt-16">
        <View className="px-6">
          <Pressable
            onPress={() => navigation.goBack()}
            testID="preview-catalog-back"
            className="mb-7 h-11 w-11 items-start justify-center"
          >
            <Text className="text-[28px] leading-none text-ink">‹</Text>
          </Pressable>
          <Text className="text-xs font-semibold uppercase tracking-[2px] text-warm">
            Developer
          </Text>
          <Text className="mt-2 text-4xl font-bold tracking-tight text-ink">UI Preview</Text>
          <Text className="mt-3 text-base leading-6 text-warm">
            Mock-screen previews for the real DayFlow UI. These screens do not use SQLite,
            notifications, SecureStore, or OpenAI.
          </Text>
        </View>

        <View className="mt-8 gap-3 px-6">
          {previewScenarios.map((scenario) => (
            <Button
              key={scenario.id}
              mode="contained"
              buttonColor={colors.ink}
              textColor={colors.white}
              onPress={() => navigation.navigate('PreviewScenario', { scenarioId: scenario.id })}
              style={{ borderRadius: 18 }}
              contentStyle={{ paddingVertical: 8 }}
            >
              {scenario.title}
            </Button>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
