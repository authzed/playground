// TODO: flatten this/use direct references
export default function AppConfig() {
  const config = {
    shareApiEndpoint: import.meta.env.VITE_SHARE_API_ENDPOINT,
    ga: {
      measurementId: import.meta.env.VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID,
    },
    discord: {
      channelId: import.meta.env.VITE_DISCORD_CHANNEL_ID,
      serverId: import.meta.env.VITE_DISCORD_SERVER_ID,
      inviteUrl: import.meta.env.VITE_DISCORD_INVITE_URL,
    },
    posthog: {
      apiKey: import.meta.env.VITE_POSTHOG_KEY,
      host: import.meta.env.VITE_POSTHOG_HOST,
    },
  };

  if (
    config.shareApiEndpoint &&
    !config.shareApiEndpoint.startsWith("http:") &&
    !config.shareApiEndpoint.startsWith("https:")
  ) {
    throw Error("Invalid Share endpoint");
  }

  return config;
}
