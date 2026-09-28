/** Check https://github.com/svg/svgo#configuration for `svgoOptions` configuration. */
export type IconSettings = {
  iconDir: string;
  svgoOptions: {
    plugins: Array<string | { name: string; params?: Record<string, unknown> }>;
  };
};
