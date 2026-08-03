# STAMP

멀티체인 NFT · 멀티토큰 원클릭 민팅 사이트.

## 지원 체인

| 계열 | 체인 |
|------|------|
| EVM | Ethereum, BNB, Polygon, Arbitrum, Avalanche, Scroll, Kaia, Silicon, ChainBounty*(L3)* |
| Solana | Solana Mainnet |
| TRON | TRON |
| XRPL | XRP Ledger |

> **ChainBounty**는 Arbitrum One 위 Orbit L3입니다 (`chainId` 51828). 가스 토큰은 BOUNTY이며 `https://rpc.chainbounty.io`로 민팅됩니다.

## 토큰 유형

| 체인 | NFT | 멀티토큰 |
|------|-----|----------|
| EVM | ERC-721 | ERC-1155 |
| Solana | Metaplex-ready | SPL Edition |
| TRON | TRC-721 | TRC-1155 |
| XRPL | NFToken | MPT |

## 시작하기

```bash
npm install --legacy-peer-deps
npm run dev
```

http://localhost:3000

## 환경 변수

```bash
cp .env.example .env.local
```

| 키 | 설명 |
|----|------|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | [Reown Dashboard](https://dashboard.reown.com) Project ID (없으면 데모 ID 사용) |
| `PINATA_JWT` | IPFS 업로드용 (없으면 data URI) |

## 지갑 (WalletConnect)

- **EVM / Solana / TRON**: Reown AppKit (WalletConnect) 모달로 연결
- **XRPL**: WalletConnect 미지원 → [GemWallet](https://gemwallet.app) 사용

## 민팅 방식

- **EVM**: ERC-721 / ERC-1155 컨트랙트 배포 후 민트
- **Solana / TRON**: 온체인 메타데이터 기록 (수량 포함)
- **XRPL**: `NFTokenMint` 또는 `MPTokenIssuanceCreate`
