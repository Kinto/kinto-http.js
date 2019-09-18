declare module "kinto-node-test-server" {
  export interface KintoServerOptions {
    maxAttempts?: number;
    pservePath?: string;
    kintoConfigPath?: string;
  }

  class KintoServer {
    public logs: string[];
    constructor(url: string, options?: KintoServerOptions);

    start(env: { [key: string]: string | number }): Promise<void>;
    flush(attempt?: number): Promise<unknown>;
    stop(): Promise<void>;
    killAll(): Promise<void>;
  }

  export default KintoServer;
}
