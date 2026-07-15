// TODO: flatten this/use direct references
export default function AppConfig() {
  const config = {
    shareApiEndpoint: import.meta.env.VITE_SHARE_API_ENDPOINT,
    aiApiEndpoint: import.meta.env.VITE_AI_API_ENDPOINT,
    // Opt-in: the AI assistant UI is hidden unless explicitly enabled. An unset or
    // empty flag (e.g. on a preview deploy without the backend configured) keeps the
    // dock button and panel hidden, rather than showing a non-functional assistant.
    aiEnabled: import.meta.env.VITE_AI_ENABLED === "true",
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
