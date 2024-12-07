import { env } from 'process';
import * as config from '../config.json';

/**
 * Configuration that we get through an environment js file.
 */
interface EnvConfig {
  OIDC_URL_PREFIX?: string;
  AUTHENTICATION_ENGINE?: string;

  AUTHZED_DEVELOPER_GATEWAY_ENDPOINT?: string | undefined | null;
  GOOGLE_ANALYTICS_MEASUREMENT_ID?: string;

  DISCORD_CHANNEL_ID?: string;
  DISCORD_INVITE_URL?: string;
  DISCORD_SERVER_ID?: string;
}

declare global {
  interface Window {
    _env_?: EnvConfig;
  }
}

interface AuthzedConfig {
  /**
   * endpoint is the endpoint for the Authzed developer gateway. Must include
   * http:// or https://.
   */
  developerEndpoint?: string | undefined | null;
}

/**
 * GoogleAnalyticsConfig is the configuration for Google Analytics.
 */
interface GoogleAnalyticsConfig {
  /**
   * measurementId is the GA monitoring ID for the app.
   */
  measurementId: string;
}

/**
 * DiscordConfig is the configuration for Discord.
 */
interface DiscordConfig {
  /**
   * channelId is the ID of the main channel on the Discord server.
   */
  channelId: string;

  /**
   * inviteUrl is the full URL for being invited into the Discord server.
   */
  inviteUrl: string;

  /**
   * serverId is the ID of the Discord server.
   */
  serverId: string;
}

interface ApplicationConfig {
  authzed?: AuthzedConfig | undefined;
  ga: GoogleAnalyticsConfig;

  discord: DiscordConfig;
}


/**
 * AppConfig returns the ApplicationConfig.
 */
export default function AppConfig(): ApplicationConfig {
  let typed = {
    authzed: config.authzed ?? ({} as AuthzedConfig),
    ga: config.ga,
    oidc: config.oidc,
    discord: config.discord,
  };

  // Environment variable overrides.
  if (window._env_) {
    if (window._env_.AUTHZED_DEVELOPER_GATEWAY_ENDPOINT) {
      typed.authzed.developerEndpoint =
        window._env_.AUTHZED_DEVELOPER_GATEWAY_ENDPOINT;
    }

    if (window._env_.GOOGLE_ANALYTICS_MEASUREMENT_ID) {
      typed.ga.measurementId = window._env_.GOOGLE_ANALYTICS_MEASUREMENT_ID;
    }

    if (window._env_.OIDC_URL_PREFIX) {
      typed.oidc.urlPrefix = window._env_.OIDC_URL_PREFIX;
    }

    if (window._env_.DISCORD_CHANNEL_ID) {
      typed.discord.channelId = window._env_.DISCORD_CHANNEL_ID;
    }

    if (window._env_.DISCORD_INVITE_URL) {
      typed.discord.inviteUrl = window._env_.DISCORD_INVITE_URL;
    }

    if (window._env_.DISCORD_SERVER_ID) {
      typed.discord.serverId = window._env_.DISCORD_SERVER_ID;
    }
  }

  if (env.NODE_ENV === 'test') {
    return typed;
  }

  if (
    typed.authzed.developerEndpoint &&
    !typed.authzed.developerEndpoint.startsWith('http:') &&
    !typed.authzed.developerEndpoint.startsWith('https:')
  ) {
    throw Error('Invalid Authzed developer endpoint');
  }

  return typed;
}
