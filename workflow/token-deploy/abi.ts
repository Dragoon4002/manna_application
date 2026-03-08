export const TokenFactoryAbi = [{
  name: "deployToken",
  type: "function",
  stateMutability: "nonpayable",
  inputs: [
    { type: "string", name: "name" },
    { type: "string", name: "symbol" },
    { type: "uint256", name: "initialSupply" },
    { type: "uint8", name: "decimals_" },
    { type: "address", name: "owner" },
    { type: "bool", name: "enableMinting" }
  ],
  outputs: [{ type: "address", name: "token" }]
}] as const;
