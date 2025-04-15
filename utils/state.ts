export interface StateDelta {
  name: string;
  operation: Record<string, any>;
}

// MappingRules is a dictionary of functions that map values of a specific key to a new value - it is applied on every key that matches filterKey.
type ArrayMapping = {
  filterKey: (key: string) => boolean;
  apply: (value: any) => any;
};

export const applyOperation = (
  state: Record<string, any>,
  delta: StateDelta,
  arrayMappings: ArrayMapping[] = [],
): Record<string, any> => {
  switch (delta.name) {
    case 'append':
      return {
        ...state,
        ...Object.keys(delta.operation.values).reduce((acc, key) => {
          const arrayMapping = arrayMappings.find((m) => m.filterKey(key));
          const mappedValue = arrayMapping ? arrayMapping.apply(delta.operation.values[key]) : delta.operation.values[key];
          acc[key] = key in state ? [...state[key], mappedValue] : [mappedValue];
          return acc;
        }, {} as Record<string, any>)
      };
    case 'set':
      return {
        ...state,
        ...Object.keys(delta.operation.values).reduce((acc, key) => {
          const arrayMapping = arrayMappings.find((m) => m.filterKey(key));
          const value = delta.operation.values[key];
          acc[key] = Array.isArray(value) && arrayMapping
            ? value.map(arrayMapping.apply)
            : value;
          return acc;
        }, {} as Record<string, any>)
      };
    case 'delete':
      return Object.keys(state).reduce((acc, key) => {
        if (!delta.operation.keys.includes(key)) {
          acc[key] = state[key];
        }
        return acc;
      }, {} as Record<string, any>);
    default:
      throw new Error(`Unknown operation: ${delta.name}`);
  }
};

