import { mergeConfig, defineConfig } from "vitest/config";
import config from './vite.config'

export default mergeConfig(config, defineConfig({
  test: {
  },
}));
