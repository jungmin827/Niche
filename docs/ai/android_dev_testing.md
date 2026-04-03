# Android 실기기 테스트 가이드

## 목적

macOS 버전이 낮아 Xcode 빌드가 불가한 환경, 또는 iOS 개발자 계정 없이
온디바이스 LLM(Jitter) 기능을 실기기에서 검증하기 위한 Android 테스트 절차.

> **참고**: Android는 `enableOpenCLAndHexagon: false` 설정으로 GPU 오프로딩 없이 CPU 추론만 동작한다.
> iOS Metal 대비 속도가 느리지만 기능 검증 목적으로는 충분하다.

---

## 0. 사전 요건

- Android 기기 (RAM 4GB 이상 권장 — 모델 런타임 ~1.6GB)
- USB 케이블 (데이터 전송 지원, 충전 전용 불가)
- Mac
- 인터넷 연결 (Android Studio ~1GB, 모델 ~1.1GB)

---

## 1. Android Studio 설치

[developer.android.com/studio](https://developer.android.com/studio) 에서 다운로드.

최초 실행 시 Setup Wizard → **Standard** 설치 선택 → Android SDK 자동 설치 (5~10분).

### 환경변수 설정

```bash
echo 'export ANDROID_HOME=$HOME/Library/Android/sdk' >> ~/.zshrc
echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools' >> ~/.zshrc
echo 'export PATH=$PATH:$ANDROID_HOME/tools' >> ~/.zshrc
source ~/.zshrc

# 확인
adb version
# Android Debug Bridge version 1.0.xx 출력되면 성공
```

---

## 2. Android 기기 개발자 모드 활성화

### 삼성 갤럭시
```
설정 → 휴대전화 정보 → 소프트웨어 정보 → 빌드 번호 7번 탭
```

### 픽셀 / 순정 Android
```
설정 → 휴대전화 정보 → 빌드 번호 7번 탭
```

### USB 디버깅 활성화
```
설정 → 개발자 옵션 → USB 디버깅 ON
```

---

## 3. 기기 연결 확인

```bash
adb devices
```

기기 화면에 **"USB 디버깅을 허용하시겠습니까?"** 팝업 → **항상 허용** 탭.

```bash
adb devices
# List of devices attached
# R3CX204XXXX    device  ← 이렇게 나오면 정상
#
# "unauthorized" → 기기에서 팝업 재확인
# "offline"      → USB 케이블 교체 또는 재연결
```

---

## 4. 빌드 실행

```bash
cd apps/mobile
npx expo run:android --device
```

### 첫 빌드 예상 흐름

```
✓ Connected device 감지
✓ Gradle 다운로드 (최초 1회, ~200MB, 5분)
✓ llama.rn C++ 컴파일 (최초 1회, 10~20분)
✓ APK 빌드 완료 → 기기 자동 설치
✓ Metro 번들러 시작 → 앱 실행
```

### 빌드 에러 대응

**`SDK location not found`**
```bash
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties
```

**`JAVA_HOME not set`**
```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
echo 'export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"' >> ~/.zshrc
source ~/.zshrc
```

**`Gradle build failed` (llama.rn 관련)**
```bash
cd android && ./gradlew clean && cd ..
npx expo run:android --device
```

**`No devices found`**
```bash
adb kill-server
adb start-server
adb devices
```

---

## 5. 동작 검증 체크리스트

### Phase 0 — 클라우드 Jitter 확인
```
□ 로그인 → 탭 화면 진입
□ 우측 하단 플로팅 버튼 탭 → Jitter 화면 열림
□ 헤더 "Cloud · responses generated remotely" 표시
□ 메시지 입력 → 정상 응답 수신
```

### Phase 1 — 온디바이스 모델 다운로드
```
□ "Enable offline AI" 배너 탭
□ Alert → "Download" 탭
□ progress bar + 진행률 % 표시 (Wi-Fi 권장, ~1.1GB)
□ 다운로드 완료 후 헤더 "On-device · private" 변경 확인
```

### Phase 1 — 온디바이스 추론
```
□ 메시지 전송 → 응답 수신 (CPU 추론: 30초~2분 예상)
□ 백그라운드 진입 → 복귀 후 재응답 확인
```

### 로그 모니터링

```bash
# 다운로드 / 모델 로딩 로그
adb logcat | grep -i "jitter\|llama\|download\|model"

# 추론 속도 확인
adb logcat | grep -i "tok/s\|tokens\|timing"
```

---

## 6. 개발 중 자주 쓰는 명령어

```bash
# JS 코드 변경 시 — Metro 자동 반영 (재빌드 불필요)
# 기기를 흔들어(shake) → Reload 탭, 또는 Metro 터미널에서 r 입력

# 캐시 초기화 후 Metro 재시작
npx expo start --clear

# 네이티브 코드 변경 시 (app.json, llama.rn 설정 등) — 반드시 재빌드
npx expo run:android --device
```

---

## 참고 — iOS 대비 차이점

| 항목 | Android (이 가이드) | iOS |
|---|---|---|
| 개발자 계정 | 불필요 | 유료($99/년) 또는 무료(7일 제한) |
| GPU 오프로딩 | 미지원 (CPU 추론) | Metal 지원 (`n_gpu_layers: 99`) |
| 추론 속도 | 30초~2분 / 응답 | ~15–20 tok/s |
| APK 유효기간 | 제한 없음 | 무료 계정 7일 |
| 첫 빌드 시간 | 10~20분 | 10~20분 |

> 온디바이스 LLM 최종 타겟은 iOS(Metal GPU)이며, Android 테스트는 기능 검증 목적이다.
> 성능 수치는 iOS 실기기에서 별도로 검증해야 한다.
