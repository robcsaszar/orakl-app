// Presentation API stubs — not yet in TypeScript's standard lib.dom.d.ts

type FrozenArray<T> = ReadonlyArray<T>;

interface PresentationConnectionList extends EventTarget {
  readonly connections: FrozenArray<PresentationConnection>;
  onconnectionavailable:
    | ((
        this: PresentationConnectionList,
        ev: PresentationConnectionAvailableEvent,
      ) => unknown)
    | null;
}

declare class PresentationConnection extends EventTarget {
  readonly id: string;
  readonly url: string;
  readonly state: "connecting" | "connected" | "closed" | "terminated";
  binaryType: "blob" | "arraybuffer";
  onconnect: ((this: PresentationConnection, ev: Event) => unknown) | null;
  onclose: ((this: PresentationConnection, ev: Event) => unknown) | null;
  onterminate: ((this: PresentationConnection, ev: Event) => unknown) | null;
  onmessage:
    | ((this: PresentationConnection, ev: MessageEvent) => unknown)
    | null;
  close(): void;
  terminate(): void;
  send(data: string | ArrayBuffer | Blob): void;
}

declare class PresentationRequest extends EventTarget {
  constructor(url: string);
  constructor(urls: string[]);
  start(): Promise<PresentationConnection>;
  reconnect(id: string): Promise<PresentationConnection>;
  getAvailability(): Promise<PresentationAvailability>;
  onconnectionavailable:
    | ((
        this: PresentationRequest,
        ev: PresentationConnectionAvailableEvent,
      ) => unknown)
    | null;
}

interface PresentationAvailability extends EventTarget {
  readonly value: boolean;
  onchange: ((this: PresentationAvailability, ev: Event) => unknown) | null;
}

interface PresentationConnectionAvailableEvent extends Event {
  readonly connection: PresentationConnection;
}

interface Navigator {
  readonly presentation: Presentation;
}

interface Presentation {
  defaultRequest: PresentationRequest | null;
  receiver: PresentationReceiver | null;
}

interface PresentationReceiver extends EventTarget {
  readonly connectionList: Promise<PresentationConnectionList>;
}
