# QuickLook.Plugin.StepViewer v1.4.0

首个适合公开发布的多格式版本。

## 支持格式

- STEP：`.stp`、`.step`
- IGES：`.igs`、`.iges`
- OpenCascade BREP：`.brep`

## 主要功能

- 选中文件并按空格键快速预览
- 完全离线解析，不上传模型
- 显示 X、Y、Z 外形尺寸，单位为毫米
- 灰色、逐面彩色、深色三种材质模式
- 模型边线显示开关
- 拖动空白区域旋转模型
- 抓住模型移动位置
- 鼠标滚轮缩放模型
- 支持中文、空格和特殊字符路径

## 安装方法

1. 下载 `QuickLook.Plugin.StepViewer.qlplugin`。
2. 确保 QuickLook 正在运行。
3. 选中 `.qlplugin` 文件并按空格键。
4. 点击 **Install**。
5. 从系统托盘完全退出并重新启动 QuickLook。
6. 选中支持的 CAD 文件并按空格键。

## 系统要求

- Windows 10/11
- QuickLook
- Microsoft Edge WebView2 Runtime

## 验证

该版本已在原生 WPF WebView2 宿主中依次验证：

- `.stp`
- `.step`
- `.igs`
- `.iges`
- `.brep`

以上格式均成功解析并生成三维模型。STL、OBJ、PLY、FBX、3MF、glTF 等格式不会被本插件抢占，继续由 QuickLook 自带插件处理。

## 隐私

所有 CAD 文件均在本机解析，不会上传至服务器。

## 致谢

- [QuickLook](https://github.com/QL-Win/QuickLook)
- [occt-import-js](https://github.com/kovacsv/occt-import-js)
- [three.js](https://github.com/mrdoob/three.js)
- [Microsoft Edge WebView2](https://developer.microsoft.com/microsoft-edge/webview2/)

作者：[@chenzubao2015](https://github.com/chenzubao2015)
