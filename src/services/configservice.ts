// TODO: flatten this/use direct references
export default function AppConfig() {
  const config = {
    authzed: {
      developerEndpoint: import.meta.env
        .VITE_AUTHZED_DEVELOPER_GATEWAY_ENDPOINT,
    },
    ga: {
      measurementId: import.meta.env.VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID,
    },
    discord: {
      channelId: import.meta.env.VITE_DISCORD_CHANNEL_ID,
      serverId: import.meta.env.VITE_DISCORD_SERVER_ID,
      inviteUrl: import.meta.env.VITE_DISCORD_INVITE_URL,
    },
  };

  if (
    config.authzed.developerEndpoint &&
    !config.authzed.developerEndpoint.startsWith("http:") &&
    !config.authzed.developerEndpoint.startsWith("https:")
  ) {
    throw Error("Invalid Authzed developer endpoint");
  }

  return config;
}
