# 인텔 맥 (macOS Ventura) 안드로이드 스튜디오 및 에뮬레이터 세팅 가이드

본 문서는 구형 인텔(Intel) 프로세서가 탑재된 Mac(macOS Ventura 13.x 환경)에서 React Native 등 프로젝트 테스트를 위한 안드로이드 스튜디오 및 에뮬레이터를 세팅하는 방법을 안내합니다.

> [!NOTE]
> **가속기(HAXM) 관련 사전 정보**
> 과거 인텔 맥에서는 에뮬레이터 가속을 위해 Intel HAXM(Hardware Accelerated Execution Manager)을 필수적으로 설치해야 했으나, 최근 Android Studio 및 에뮬레이터 버전에서는 이를 **더 이상 지원하지 않으며(Deprecated)**, macOS 자체에 내장된 `Hypervisor.Framework`를 자동으로 사용하여 가속합니다. 따라서 별도의 HAXM 설치는 필요하지 않으며 시도하지 않는 것이 좋습니다.

---

## 1. 안드로이드 스튜디오 설치

1. **다운로드**: [Android Studio 공식 웹사이트](https://developer.android.com/studio)에 접속합니다.
2. 다운로드 버튼 클릭 시 Mac 버전을 선택하는 화면이 나오면, 반드시 **"Mac with Intel chip"** 버전을 선택하여 다운로드 및 설치합니다.
3. 설치된 Android Studio를 실행하고 초기 설정 마법사(Setup Wizard)를 따라 **Standard** 옵션으로 진행하여 기본 SDK를 설치합니다.

## 2. 필수 Android SDK 및 툴 설치

프로젝트 실행을 위해 필수 SDK와 커맨드라인 툴을 확인하고 설치합니다.

1. Android Studio 실행 후 우측 상단의 점 3개 메뉴(또는 시작 화면의 More Actions) > **SDK Manager**를 엽니다.
2. **SDK Platforms** 탭:
   - React Native 버전에서 요구하는 버전(예: `Android 13.0 ("Tiramisu")` 또는 `Android 14.0 ("UpsideDownCake")`)이 체크되어 있는지 확인합니다.
3. **SDK Tools** 탭: 하단 우측의 **"Show Package Details"**를 체크합니다.
   - `Android SDK Build-Tools` (프로젝트에서 요구하는 버전, 예를 들어 `34.0.0` 등) 확인
   - `Android Emulator` 체크 확인
   - `Android SDK Platform-Tools` 체크 확인
   - `Android SDK Command-line Tools (latest)` 체크 확인 (매우 중요)
4. 우측 하단의 **Apply**를 눌러 필요한 툴들을 모두 다운로드 및 설치합니다.

## 3. 환경 변수 (PATH) 설정

터미널에서 `adb` 및 에뮬레이터 등의 Android 명령어를 바로 사용할 수 있도록 환경 변수를 설정합니다.

1. 터미널 앱을 엽니다.
2. Zsh 프로필 파일을 엽니다:
   ```bash
   nano ~/.zshrc
   ```
3. 파일의 맨 아래에 다음 내용(경로)을 추가합니다. (유저명과 경로는 보통 디폴트 상태 그대로입니다.)
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
   ```
4. 저장(Ctrl+O, Enter) 후 종료(Ctrl+X)합니다.
5. 터미널에 변경 사항을 적용합니다:
   ```bash
   source ~/.zshrc
   ```

## 4. 인텔 맥 전용 에뮬레이터(AVD) 생성

인텔 맥에서는 에뮬레이터가 원활하게 작동하기 위해 아키텍처(ABI)를 `x86_64` 또는 `x86`으로 맞춰주는 것이 필수적입니다. (`arm64` 이미지를 받을 경우 엄청나게 느리거나 실행되지 않습니다.)

1. Android Studio 우측 상단의 **Device Manager** 아이콘을 클릭하거나, 메뉴에서 Tools > Device Manager를 엽니다.
2. **Create Device(또는 + 버튼)** 아이콘을 클릭합니다.
3. **Hardware**: `Pixel 6` 또는 `Pixel 7`과 같은 원하는 기기를 선택하고 Next를 누릅니다.
4. **System Image**:
   - `x86 Images` 탭 또는 `Recommended` 탭을 확인합니다.
   - 반드시 **ABI**가 `x86_64` (또는 `x86`)으로 되어 있는 시스템 이미지를 선택하여 다운로드(`Download` 버튼) 합니다.
   - 추천 시스템 이미지 예시: `API Level 34` 또는 `33`, Target이 `Google APIs` 또는 `Google Play`인 `x86_64` 이미지.
5. 다운로드가 완료되면 해당 이미지를 선택하고 Next를 누릅니다.
6. AVD Name을 지정해 준 뒤(예: `Pixel_6_Intel_API_34`), 우측 하단의 **Finish**를 누릅니다.
7. Device Manager 리스트에 나타난 에뮬레이터의 **재생 버튼(Launch)**을 눌러 에뮬레이터가 정상적으로 켜지는지 확인합니다.

---

> [!TIP]
> **성능 최적화 팁 (메모리 및 CPU)**
> 인텔 맥 구형 모델의 경우 에뮬레이터를 실행하면 쿨링팬이 심하게 돌거나 버벅일 수 있습니다.
> AVD 매니저에서 방금 만든 에뮬레이터의 우측 수정(연필 아이콘) 버튼을 누르고 **Show Advanced Settings** 활성화 후 다음의 설정을 추천합니다:
> - **Boot option**: `Quick boot`
> - **RAM**: `2048 MB` 또는 `4096 MB` (컴퓨터 사양에 맞게 조정)
> - **VM heap**: `256 MB`
> - **Graphics**: `Hardware - GLES 2.0` (그래픽 깨짐이 발생할 경우 `Software`로 우회, 보통은 `Hardware` 권장 성능)
