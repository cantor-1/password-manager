# DOTKEY — Mac / Windows / Android 打包指南

## 项目结构

```
dotkey-build/
├── core/           # 共享加密核心（所有平台共用）
├── desktop/        # Mac + Windows（Tauri）
└── android/        # Android（Capacitor）
```

## 前置要求

- **Node.js 18+** (推荐 20 LTS)
- **Rust** (桌面版需要): `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **Android Studio** (Android 版需要)
- **Xcode** (Mac 真机签名需要，模拟器不需要)

---

## Mac + Windows 桌面版（Tauri）

### 1. 安装依赖
```bash
cd core
npm install
npm run build
cd ../desktop
npm install
```

### 2. 开发调试
```bash
npm run tauri-dev
```

### 3. 打包

**Mac（Apple Silicon M1/M2/M3）:**
```bash
npm run tauri-build-mac
```
输出: `src-tauri/target/release/bundle/macos/DOTKEY.app`

**Mac（Intel）:**
```bash
npm run tauri-build-mac-intel
```

**Windows:**
```bash
npm run tauri-build-win
```
输出: `src-tauri/target/release/bundle/msi/*.msi` 和 `*.exe`

**双平台（在 Mac 上交叉编译 Windows 需要额外配置）:**
```bash
# Mac 上同时打包 Mac + Windows
npm run tauri-build
```

### VS Code 打包步骤
1. VS Code 打开 `desktop/` 文件夹
2. 终端执行 `npm install`
3. 执行 `npm run tauri-build-mac`（或对应平台命令）
4. 在 `src-tauri/target/release/bundle/` 找安装包

---

## Android 版（Capacitor）

### 1. 安装依赖
```bash
cd core
npm install
npm run build
cd ../android
npm install
```

### 2. 添加 Android 平台
```bash
npx cap add android
```

### 3. 同步代码到 Android 项目
```bash
npm run build
npx cap sync
```

### 4. 用 Android Studio 打开并打包
```bash
npm run open
```

Android Studio 打开后：
- Build → Generate Signed Bundle / APK
- 选择 APK → 创建/选择签名密钥
- 选择 release → Finish

输出 APK 在 `android/app/build/outputs/apk/release/`

### VS Code 打包步骤
1. VS Code 打开 `android/` 文件夹
2. 终端执行 `npm install`
3. 执行 `npx cap add android`（首次）
4. 执行 `npm run build && npx cap sync`
5. 执行 `npm run open` 打开 Android Studio
6. Android Studio 中 Build → Generate Signed APK

---

## 文件互通

所有平台生成相同的 `.mm` 文件格式：
- 桌面版保存的 `.mm` 可以传到手机用 Android 版打开
- Android 版保存的 `.mm` 可以传到电脑用桌面版打开
- 主密码就是唯一的密钥

## 加密规格

| 参数 | 值 |
|---|---|
| 对称加密 | XChaCha20-Poly1305 |
| 密钥派生 | Argon2id (t=3, m=64MB, p=4) |
| 文件格式 | `.mm` |


---

## GitHub Actions 自动打包（推荐）

如果你不想在本地装 Rust/Android Studio，可以用 GitHub 免费自动打包。

### 使用方法

1. **在 GitHub 创建新仓库**，比如 `yourname/dotkey`
2. **把代码推上去**：
```bash
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin https://github.com/yourname/dotkey.git
git push -u origin main
```
3. **打标签触发打包**：
```bash
git tag v1.0.0
git push origin v1.0.0
```
4. **等 5-10 分钟**，去 GitHub 仓库 → Actions 看进度
5. **去 Releases 页面下载**：
   - `DOTKEY-mac.zip` — Mac 版（Apple Silicon + Intel）
   - `DOTKEY-windows.msi` — Windows 安装包
   - `DOTKEY-android.apk` — Android 安装包

### 每次更新代码后

```bash
git add .
git commit -m "update"
git tag v1.0.1
git push origin main --tags
```

GitHub 自动重新打包，你去 Releases 下载最新版。

---

## 本地打包（备选）

### Mac（需要 Rust + Xcode CLI）
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
xcode-select --install
cd desktop && npm install && npm run tauri-build-mac
```

### Windows（需要 Rust + VS Build Tools）
```bash
# 在 Windows PowerShell 执行
winget install Rustlang.Rustup
cd desktop && npm install && npm run tauri-build-win
```

### Android（需要 Android Studio）
```bash
cd android && npm install
npx cap add android
npm run build && npx cap sync
npx cap open android
# 然后在 Android Studio 里 Build → Generate Signed APK
```
