export function isRouteScreenProps<TRoute extends object, TEmbedded extends object>(
  props: TRoute | TEmbedded,
): props is TRoute {
  return 'navigation' in props;
}

export function hasScenarioId<T extends object, ScenarioId extends string = string>(
  props: T,
): props is T & { scenarioId: ScenarioId } {
  return 'scenarioId' in props;
}
