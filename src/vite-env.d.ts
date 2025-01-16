/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTHENTICATION_ENGINE?: string;

  readonly VITE_AUTHZED_DEVELOPER_GATEWAY_ENDPOINT?: string | undefined | null;
  readonly VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID?: string;

  readonly VITE_DISCORD_CHANNEL_ID?: string;
  readonly VITE_DISCORD_INVITE_URL?: string;
  readonly VITE_DISCORD_SERVER_ID?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
