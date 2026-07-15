export interface SseSink {
  send(event: string, data: unknown): void;
  end(): void;
}

export function formatSseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function createWritableSseSink(write: (chunk: string) => void, end: () => void): SseSink {
  let ended = false;
  return {
    send(event, data) {
      if (ended) return;
      write(formatSseEvent(event, data));
    },
    end() {
      if (ended) return;
      ended = true;
      end();
    },
  };
}
