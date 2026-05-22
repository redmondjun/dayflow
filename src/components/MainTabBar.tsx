import { Pressable, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import MainIcon from '../assets/icons/main-tab.svg';
import SettingIcon from '../assets/icons/setting-tab.svg';
import WeeklyIcon from '../assets/icons/weekly-tab.svg';

export type MainTabId = 'main' | 'weekly' | 'setting';

type TabItem = {
  id: MainTabId;
  label: string;
};

const tabs: TabItem[] = [
  { id: 'main', label: 'Main' },
  { id: 'weekly', label: 'Weekly Insight' },
  { id: 'setting', label: 'Setting' },
];

const tabIcons = {
  main: MainIcon,
  weekly: WeeklyIcon,
  setting: SettingIcon,
} as const;

type Props = {
  activeTab: MainTabId;
  onSelectTab: (tab: MainTabId) => void;
};

export function MainTabBar({ activeTab, onSelectTab }: Props) {
  const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);

  return (
    <View className="border-t border-warm3 bg-paper">
      <View className="relative">
        <View
          className="absolute top-0 h-[2.5px] w-10 rounded-full bg-accent"
          style={{ left: `${activeIndex * 33.333 + 16.667}%`, marginLeft: -20 }}
        />
        <View className="flex-row px-2 pb-7 pt-3">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            const Icon = tabIcons[tab.id];
            const color = isActive ? colors.ink : colors.warm2;

            return (
              <Pressable
                key={tab.id}
                onPress={() => onSelectTab(tab.id)}
                className="flex-1 items-center gap-1"
              >
                <Icon width={22} height={22} color={color} />
                <Text
                  className={`text-[10px] tracking-tight ${isActive ? 'font-semibold text-ink' : 'font-normal text-warm2'}`}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
