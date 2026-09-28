# GitHub 发布指南

本文面向第一次把 `QuickLook.Plugin.StepViewer` 发布到 GitHub 的维护者。

## 一、发布前检查

仓库中应包含：

```text
QuickLook.Plugin.StepViewer.csproj
Plugin.cs
StepViewerPanel.cs
Web/
Scripts/
README.md
LICENSE.txt
THIRD-PARTY-NOTICES.txt
CHANGELOG.md
.gitignore
package.json
package-lock.json
```

不要提交：

```text
node_modules/
bin/
obj/
Build/
*.qlplugin
*.zip
.dotnet/
```

这些内容已在 `.gitignore` 中排除。`.qlplugin` 应上传到 GitHub Release，而不是提交到 Git 仓库。

## 二、准备仓库信息

推荐仓库名：

```text
QuickLook.Plugin.StepViewer
```

推荐 Description：

```text
Offline STEP, IGES and BREP preview plugin for QuickLook on Windows.
```

中文简介：

```text
适用于 Windows QuickLook 的离线 STEP、IGES 与 BREP 三维预览插件。
```

推荐 Topics：

```text
quicklook
quicklook-plugin
step
stp
iges
brep
cad
3d-viewer
opencascade
threejs
webview2
windows
```

推荐设置：

- Visibility：Public
- Issues：开启
- Discussions：可选
- Wiki：不需要，README 已足够
- License：不要在 GitHub 建仓时重复生成；项目已包含 `LICENSE.txt`

## 三、通过网页创建仓库

1. 登录 GitHub。
2. 点击右上角 **+**，选择 **New repository**。
3. Owner 选择 `chenzubao2015`。
4. Repository name 输入 `QuickLook.Plugin.StepViewer`。
5. 填写上面的 Description。
6. 选择 **Public**。
7. 不要勾选自动创建 README、`.gitignore` 或 License，避免和本地文件冲突。
8. 点击 **Create repository**。

GitHub 官方参考：[Creating a repository for your project on GitHub](https://docs.github.com/en/enterprise-server@3.21/get-started/start-your-journey/creating-a-repository-for-your-project-on-github)

## 四、上传本地源码

在项目目录打开 PowerShell：

```powershell
git init
git branch -M main
git add .
git status
git commit -m "Initial release: QuickLook.Plugin.StepViewer v1.4.0"
git remote add origin https://github.com/chenzubao2015/QuickLook.Plugin.StepViewer.git
git push -u origin main
```

远程地址来自已创建的 GitHub 仓库页面。

执行 `git add .` 后必须先看 `git status`，确认没有 `node_modules`、`Build`、`obj`、`.qlplugin` 或 ZIP 被加入。

如果已使用 GitHub Desktop：

1. 打开 GitHub Desktop。
2. 选择 **File → Add local repository**。
3. 选择本项目目录。
4. 若提示尚非 Git 仓库，选择创建仓库。
5. 填写提交说明并 Commit。
6. 点击 **Publish repository**。
7. 取消 **Keep this code private**，再发布。

GitHub 官方参考：[Adding an existing project using GitHub Desktop](https://docs.github.com/en/enterprise-server@3.22/desktop/adding-and-cloning-repositories/adding-an-existing-project-to-github-using-github-desktop)

## 五、设置 About 与 Topics

进入仓库首页：

1. 点击右侧 **About** 区域的齿轮。
2. Description 填写：

```text
Offline STEP, IGES and BREP preview plugin for QuickLook on Windows.
```

3. Website 可留空。
4. 添加 Topics：

```text
quicklook quicklook-plugin step stp iges brep cad 3d-viewer opencascade threejs webview2 windows
```

5. 勾选 **Releases**。
6. 保存。

## 六、创建 v1.4.0 Release

先在本地生成安装包：

```powershell
powershell -ExecutionPolicy Bypass -File .\Scripts\pack.ps1
```

然后：

1. 打开仓库的 **Releases**。
2. 点击 **Draft a new release**。
3. 选择 **Create new tag**。
4. Tag 填写 `v1.4.0`。
5. Target 选择 `main`。
6. Release title 填写：

```text
QuickLook.Plugin.StepViewer v1.4.0
```

7. 将 `RELEASE_NOTES_v1.4.0.md` 的正文复制到说明框。
8. 上传：

```text
QuickLook.Plugin.StepViewer.qlplugin
```

9. 如需同时提供源码 ZIP，可以上传 `QuickLook.Plugin.StepViewer.Source.zip`；GitHub 本身也会自动生成 Source code ZIP/TAR。
10. 不勾选 pre-release。
11. 发布前确认安装包来自最终构建。
12. 点击 **Publish release**。

## 七、推荐的仓库首页文案

### GitHub Description

```text
Offline STEP, IGES and BREP preview plugin for QuickLook on Windows.
```

### 社交平台简短介绍

```text
发布了一个 Windows QuickLook CAD 预览插件：选中 STEP、IGES 或 BREP 文件，按空格键即可离线快速预览。支持尺寸显示、逐面彩色、边线、旋转、移动和缩放，模型不会上传服务器。
```

### 中文项目介绍

```text
QuickLook.Plugin.StepViewer 是一款面向 Windows QuickLook 的离线 CAD 三维预览插件，支持 STP、STEP、IGS、IGES 和 BREP。无需启动大型 CAD 软件，选中文件按空格键即可查看模型、外形尺寸、边线和逐面颜色。所有解析均在本机完成。
```

### 英文项目介绍

```text
QuickLook.Plugin.StepViewer is an offline CAD preview plugin for QuickLook on Windows. Select a STEP, IGES or OpenCascade BREP file and press Space to preview it instantly, including dimensions, edges and per-face colors. Files are parsed locally and never uploaded.
```

## 八、后续版本发布流程

每次发布新版本：

1. 修改 `QuickLook.Plugin.Metadata.config` 版本。
2. 修改 `package.json` 版本。
3. 更新 `Web/index.html` 的静态资源缓存版本。
4. 更新 `CHANGELOG.md`。
5. 构建并运行格式回归测试。
6. 提交代码并打新 Tag，例如 `v1.4.1`。
7. 创建 GitHub Release 并上传新的 `.qlplugin`。
8. 不要替换旧 Release 的文件；保留历史版本，方便回退。

## 九、Issue 模板建议

用户提交问题时，建议要求提供：

```text
- QuickLook 版本：
- 插件版本：
- Windows 版本：
- 文件格式：STP / STEP / IGS / IGES / BREP
- 文件大小：
- 问题现象：
- 是否包含中文或特殊字符路径：
- 可否提供脱敏后的测试文件：
```

不要要求用户公开上传含商业机密的 CAD 文件。可以建议其制作一个可复现问题的简化模型。
