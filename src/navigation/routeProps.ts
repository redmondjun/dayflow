export function hasNavigation<T extends object>(props: T): props is T & { navigation: unknown } {
  return 'navigation' in props;
}

export function hasScenarioId<T extends object>(props: T): props is T & { scenarioId: string } {
  return 'scenarioId' in props;
}
