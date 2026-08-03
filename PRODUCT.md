# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

개인 크리에이터. 여러 체인을 일일이 익히지 않고, 자신의 작품을 NFT나 멀티토큰으로 빠르게 민팅하려는 사람.

## Product Purpose

STAMP는 EVM, Solana, TRON, XRP Ledger에서 NFT·멀티토큰을 한 화면 흐름으로 민팅하게 한다. 성공은 사용자가 체인 선택 → 업로드 → 민팅까지 막힘 없이 끝내는 것이다.

## Positioning

아주 쉽게 민팅할 수 있다. 체인별 도구를 찾아다니지 않고, 한 흐름에서 끝낸다.

## Operating Context

지갑 연결(EVM/Solana/TRON은 Reown AppKit, XRPL은 GemWallet), 이미지·메타데이터 업로드(Pinata JWT가 있으면 IPFS, 없으면 data URI), 체인별 민팅 어댑터. 한국어 UI.

## Capabilities and Constraints

- 지원: EVM(Ethereum, BNB, Polygon, Arbitrum, Avalanche, Scroll, Kaia, Silicon, ChainBounty L3), Solana, TRON, XRPL
- 토큰: NFT와 멀티토큰(체인별 표준 상이)
- EVM은 지갑으로 컨트랙트 배포 후 민트
- ChainBounty는 Arbitrum One 위 Orbit L3 (`chainId` 51828, 가스=BOUNTY, RPC=`https://rpc.chainbounty.io`)
- 미결정: 가격·요금제, 계정 시스템, 마켓플레이스 연동

## Brand Commitments

이름: STAMP. 보이스: 짧고 직접적(예: “체인 고르고, 올리고, 찍는다.”).

## Evidence on Hand

- README.md, `src/app/page.tsx` 카피, `src/lib/chains.ts` 체인 목록
- 실제 사용자 후기·벤치마크·경쟁 비교 자료 없음 — 앞으로 날조하지 말 것

## Product Principles

1. 쉬움이 최우선 — 단계와 용어를 줄인다.
2. 한 흐름 — 체인·지갑·업로드·민팅을 한 화면에서 이어간다.
3. 체인 사실을 숨기지 않는다 — 수수료·지갑·표준 차이는 짧게 알려준다.
4. 증명 없는 주장은 쓰지 않는다.
