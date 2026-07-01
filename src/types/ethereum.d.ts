interface EthereumProvider {
  request<T = unknown>(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<T>;
  on?(event: "accountsChanged", listener: (accounts: string[]) => void): void;
  on?(event: "chainChanged", listener: (chainId: string) => void): void;
  removeListener?(event: "accountsChanged", listener: (accounts: string[]) => void): void;
  removeListener?(event: "chainChanged", listener: (chainId: string) => void): void;
}

interface Window {
  ethereum?: EthereumProvider;
}
