import {NativeModules, Platform} from 'react-native';

const {BatteryOptimizationModule} = NativeModules;

export const BatteryOpt = {
  isIgnoringBatteryOptimizations: async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      return await BatteryOptimizationModule.isIgnoringBatteryOptimizations();
    } catch {
      return true;
    }
  },
  requestIgnoreBatteryOptimizations: (): void => {
    if (Platform.OS !== 'android') return;
    BatteryOptimizationModule.requestIgnoreBatteryOptimizations();
  },
};
