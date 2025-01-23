import { useTheme } from '@material-ui/core/styles';
import { useEffect, useRef } from 'react';

export interface DiscordChatCrateProps {
  serverId?: string;
  channelId?: string;
}

// Copied from: https://github.com/widgetbot-io/crate/blob/f34b7d18429326a8ce3073ae27fa7a3ae5c914b5/src/types/options.d.ts#L7
type url = string;
type size = string;

type horizontal = 'top' | 'bottom' | number;
type vertical = 'left' | 'right' | number;

interface Options {
  // Server + channel IDs
  server: string;
  channel?: string;

  // Dynamic username
  username?: string;

  // Where the button should appear on-screen
  location?: [horizontal, vertical];

  // The color of the button
  color?: string;
  // The glyph to display on the button
  glyph?: [url, size];
  // Custom CSS to be injected into the Shadow root
  css?: string;

  // Message notifications
  notifications?: boolean;
  // Unread message indicator
  indicator?: boolean;
  // Notification timeout
  timeout?: number;

  // Only load the widget once the user opens it
  defer?: boolean;
  // Connect to a custom WidgetBot server
  shard?: url;
}

interface Crate {
  node: Element;
}

// Copied from: https://github.com/widgetbot-io/crate/blob/master/src/util/cdn.ts#L3
const CDN_URL = `https://cdn.jsdelivr.net/npm/@widgetbot/crate@3`;

// TODO: replace with a script loader
const loadFromCDN = () =>
  new Promise<new (options: Options) => Crate>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = CDN_URL;
    document.head.appendChild(script);

    script.onload = () => resolve(window.Crate);
    script.onerror = () => reject('Failed to load Crate!');
  });

/**
 * DiscordChatCrate creates a WidgetBot.io crate for a Discord channel.
 */
export const DiscordChatCrate = ({ serverId, channelId }: DiscordChatCrateProps) => {
  const crate = useRef<Crate | undefined>(undefined);
  const injected = useRef(false);

  const theme = useTheme();
  const glyph = {
    uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAACXBIWXMAAAsTAAALEwEAmpwYAAABo0lEQVRIicWXMU8UURRGzwKBhi1MlkYTCixtiIWdhVjZaiT0NPwELGn4B5Za0RgTtNoOoqHUTgsb2GYJIUNCARQkhEMxb3V3mFn3ze7sfslrJvO+M/fOvHvv1FQmoamJUCcJnhnwvmngBbACPAOWgAZQBy6AM+AI+AHsAd+Am76Oar/VULfUU+N0GvY1irz7QdfV80hgVufBZyDwrLozJDCrneBbCK6puyOGdrSrThWBNyuCdvSuw6r5r4A8Ag6BuZhjEalr4DFw3H2ONyqGEvw3oLeAvKoY2sPpTvUFMD8G8CVQ74646jR3NAu9qW6PCXySBX8fE3g/C/4wJvBH4F4B+VJxAfmaV0AAFoCfwGIFkbaBp0AC9weBBHgJtEYMbZH28+TvFXNalrqgNkeU3mbwG7gfo75Wf5cE/gr7c72z7zhPNeA58Cak6wnFs9of0uPyCTgAis3/E3HeOuiK6kpdVZfVeoxPLPShehOgt+rbEg+OGj3erpNOnLek7e1z5P5SqX6gJuqlulY20piPC9L5+32Idpt0hh5Kg4JHron9wtwBvs6360AoQqwAAAAASUVORK5CYII=',
    size: '30px',
  };
  const color = theme.palette.primary.main;

  useEffect(() => {
    if (
      crate.current !== undefined ||
      injected.current ||
      !serverId ||
      !channelId
    ) {
      return;
    }
    (async () => {
      injected.current = true;

      const CrateConstructor = await loadFromCDN();
      const created = new CrateConstructor({
        server: serverId,
        channel: channelId,
        glyph: [glyph.uri, glyph.size],
        defer: true,
        color: color,
        shard: 'https://emerald.widgetbot.io',
      });
      created.node.setAttribute('title', 'Chat with us');
      crate.current = created;
    })();

    // NOTE: we disable the deps here to prevent the component from being re-added, as there
    // is currently no way to dispose of the older Crate and create a new one. This does mean
    // that once a crate is added, it *cannot* be changed, but that should be okay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId, channelId]);

  return <span key="discord-crate" />;
};
