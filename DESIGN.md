---
name: STAMP
description: 멀티체인 NFT·멀티토큰을 한 흐름으로 찍는 민팅 사이트
colors:
  ink: "#0e0e0e"
  pink: "#ff2d55"
  lime: "#c8ff00"
  cream: "#f4f0e6"
  cream-2: "#e6ddd0"
  bleached: "#c4b8a8"
  muted: "#3a3a3a"
  white: "#ffffff"
typography:
  display:
    fontFamily: "Archivo Black, Impact, sans-serif"
    fontSize: "clamp(4.5rem, 18vw, 10rem)"
    fontWeight: 400
    lineHeight: 0.82
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Archivo Black, Impact, sans-serif"
    fontSize: "3rem"
    fontWeight: 400
    lineHeight: 0.9
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Fragment Mono, ui-monospace, monospace"
    fontSize: "0.7rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.14em"
  button:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.04em"
rounded:
  none: "0"
spacing:
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2.5rem"
  section: "3.5rem"
components:
  button-primary:
    backgroundColor: "{colors.pink}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "12px 20px"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream}"
    rounded: "{rounded.none}"
    padding: "12px 20px"
  button-lime:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "12px 20px"
  input:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "10px 12px"
  sheet-pink:
    backgroundColor: "{colors.pink}"
    textColor: "{colors.ink}"
  sheet-lime:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.ink}"
  sheet-cream:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
---

# Design System: STAMP

## Overview

**Creative North Star: "Torn Flyer Wall"**

민팅은 오늘 밤의 전단을 벽에 스테이플하는 일이다. 복기 검정 벽 위에 형광 분홍·라임 지가 겹치고, 찢긴 틈으로 이전 밤(체인)이 보인다. 카드 중첩 대신 **장(sheet) 겹침**이 구조다.

**Key Characteristics:**
- Full-bleed 전단 벽 히어로 + 단계별 컬러 장
- Archivo Black 디스플레이 / Public Sans 본문 / Fragment Mono 라벨
- 하드 오프셋 그림자, 0 radius, 스테이플 장식
- Inter · 보라 그라데이션 · 글래스모피즘 금지

## Colors

형광 지 + 복기 잉크. Committed: 분홍·라임이 넓은 장을 먹는다.

### Primary
- **Flyer Pink** (#ff2d55): 히어로 장, 프라이머리 CTA, 에러 장
- **Acid Lime** (#c8ff00): 체인 장, 상태 바, 포커스/셀렉션

### Neutral
- **Xerox Ink** (#0e0e0e): 벽·보더·선택 칩
- **Cream Stock** (#f4f0e6): 작업 장·입력
- **Cream Mid** (#e6ddd0): 드롭존
- **Sun Bleached** (#c4b8a8): 아래층 장
- **Muted Ink** (#3a3a3a): 보조(크림 장 위만)

### Named Rules
**The Fluorescent Stock Rule.** 장식용 보라·네온 그라데이션 금지. 분홍·라임만 형광 역할.

## Typography

**Display:** Archivo Black (system headlines)  
**Tag / Graffiti:** Bangers (hero STAMP throw-up)  
**Marker:** Permanent Marker (scribbles, TEAR notes)  
**Body:** Public Sans  
**Label/Mono:** Fragment Mono

### Hierarchy
- **Display** — 히어로 STAMP
- **Headline** — 위자드 단계 제목 (display-stamp)
- **Title** — 히어로 한 줄 카피
- **Body** — 설명·폼
- **Label** — xerox-label uppercase

## Layout

`max-w-6xl`. 히어로 `min-h-[88vh]` 풀블리드 겹침 장. 민팅은 `#mint`에서 라임 보더로 찢어 시작. 단계는 sheet-lime → sheet-pink → sheet-cream 순서.

## Elevation & Depth

하드 오프셋 `4px 6px 0` 그림자 + 회전된 아래층 장. 소프트 블러/글래스 금지.

## Motion

**Thesis:** 전단을 찢어 민팅으로 들어간다.
- **Focal:** 히어로 우상단 `TEAR` 핸들을 드래그(또는 CTA)하면 분홍 장이 벗겨지며 `#mint`로 스크롤
- **Tilt:** 히어로 위 포인터로 장 스택이 미세 기울기
- **Feedback:** 체인 칩 hover lift + 선택 `OK` 스탬프, 버튼 press 시 오프셋 붕괴, 시트 스크롤 인 + hover 들어올림
- **Rail:** `TearRail` 점선 위를 핑크 마커가 왕복 — 클릭 시 민팅으로
- Reduce Motion 시 제스처는 즉시 스크롤로 대체, 루프 모션 중지

## Shapes

`border-radius: 0`. 찢김은 `clip-path` polygon. 체인 칩도 각진 스티커.

## Components

### Buttons
`.btn-stamp` + `.btn-pink` / `.btn-ink` / `.btn-lime` / `.btn-ghost`. Active 시 2px 밀림.

### Sheets
`.sheet` + color + `.sheet-torn`. 스테이플은 모서리 장식.

### Inputs
`.input-flyer` — 2px ink 보더, focus 시 lime 오프셋.

### Chain icons
잉크 사각 + lime/pink/cream 글리프. 브랜드 무지개 금지.

## Do's and Don'ts

### Do:
- **Do** 첫 뷰포트에 STAMP를 전단 타이포로 압도할 것
- **Do** 민팅 단계를 별도 장(sheet)으로 찢어 쌓을 것
- **Do** 분홍·라임·크림·잉크만 쓸 것

### Don't:
- **Don't** Quiet Press 틸·Syne·둥근 카드로 되돌리지 말 것
- **Don't** 보라 그라데이션·글래스·바운스 이징
- **Don't** 카드 안에 카드
- **Don't** Inter / Roboto / DM Sans / Syne를 주 글꼴로
