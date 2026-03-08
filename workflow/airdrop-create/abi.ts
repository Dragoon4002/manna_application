// Shared ABI fragments for all workflows

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

export const FairLaunchAbi = [
  {
    name: "finalize",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ type: "uint256", name: "launchId" }],
    outputs: []
  },
  {
    name: "getLaunch",
    type: "function",
    stateMutability: "view",
    inputs: [{ type: "uint256", name: "launchId" }],
    outputs: [{
      type: "tuple",
      components: [
        { type: "address", name: "token" },
        { type: "address", name: "creator" },
        { type: "uint256", name: "totalTokens" },
        { type: "uint256", name: "tokensSold" },
        { type: "uint256", name: "hardCap" },
        { type: "uint256", name: "softCap" },
        { type: "uint256", name: "raised" },
        { type: "uint256", name: "startTime" },
        { type: "uint256", name: "endTime" },
        { type: "uint256", name: "maxPerWallet" },
        { type: "uint256", name: "startPrice" },
        { type: "uint256", name: "endPrice" },
        { type: "bool", name: "finalized" },
        { type: "bool", name: "success" }
      ]
    }]
  },
  {
    name: "launchCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }]
  },
  {
    name: "nextLaunchId",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }]
  }
] as const;

export const HumanDropAbi = [
  {
    name: "createAirdrop",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { type: "address", name: "token" },
      { type: "uint256", name: "amountOrb" },
      { type: "uint256", name: "amountDevice" },
      { type: "uint256", name: "maxClaims" },
      { type: "uint256", name: "expiry" }
    ],
    outputs: [{ type: "uint256", name: "airdropId" }]
  },
  {
    name: "nextAirdropId",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }]
  },
  {
    name: "getAirdrop",
    type: "function",
    stateMutability: "view",
    inputs: [{ type: "uint256", name: "airdropId" }],
    outputs: [{
      type: "tuple",
      components: [
        { type: "address", name: "token" },
        { type: "uint256", name: "amountOrb" },
        { type: "uint256", name: "amountDevice" },
        { type: "uint256", name: "totalClaimed" },
        { type: "uint256", name: "maxClaims" },
        { type: "uint256", name: "expiry" },
        { type: "address", name: "creator" },
        { type: "bool", name: "active" }
      ]
    }]
  },
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ type: "uint256", name: "airdropId" }],
    outputs: []
  },
  {
    name: "isEligible",
    type: "function",
    stateMutability: "view",
    inputs: [
      { type: "uint256", name: "airdropId" },
      { type: "uint256", name: "nullifierHash" }
    ],
    outputs: [{ type: "bool" }]
  }
] as const;

export const MannaTokenAbi = [{
  name: "mint",
  type: "function",
  stateMutability: "nonpayable",
  inputs: [
    { type: "address", name: "to" },
    { type: "uint256", name: "amount" }
  ],
  outputs: []
}] as const;

export const MannaIndexAbi = [
  {
    name: "updateStats",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { type: "uint256", name: "totalAirdrops" },
      { type: "uint256", name: "totalLaunches" },
      { type: "uint256", name: "totalUsers" },
      { type: "uint256", name: "totalVolume" }
    ],
    outputs: []
  },
  {
    name: "updateChainStats",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { type: "string", name: "chainName" },
      { type: "uint256", name: "airdrops" },
      { type: "uint256", name: "launches" },
      { type: "uint256", name: "users" },
      { type: "uint256", name: "volume" }
    ],
    outputs: []
  },
  {
    name: "getStats",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{
      type: "tuple",
      components: [
        { type: "uint256", name: "totalAirdrops" },
        { type: "uint256", name: "totalLaunches" },
        { type: "uint256", name: "totalUsers" },
        { type: "uint256", name: "totalVolume" },
        { type: "uint256", name: "lastUpdate" }
      ]
    }]
  }
] as const;
