# ZeroDrop：多功能文件与传输工具

ZeroDrop is a highly secure, serverless browser-based toolkit designed for ultimate privacy. By leveraging WebRTC data channels, it enables high-speed, peer-to-peer end-to-end encrypted file and text transfers without any intermediary servers.

Beyond standard P2P sharing, ZeroDrop introduces hardcore privacy features like "Mission Impossible" Mode (10-second auto-destructing text with physical memory wiping) and "Hold-to-Reveal" Mode (anti-peep blurred image rendering). Coupled with local-only PDF watermarking and ID photo formatting tools, ZeroDrop offers a seamless, zero-footprint data interaction experience right in your browser. No installation, no registration, no traces left behind.

## 项目简介

ZeroDrop 是一个集成了多种实用功能的浏览器端工具箱，它完全在您的浏览器中运行，无需安装任何桌面软件。它旨在提供一个安全、便捷、高效的解决方案，来满足您日常工作和生活中常见的文件处理和传输需求。

目前，ZeroDrop 提供了三大核心功能：

1.  **P2P 安全直连传输**：一个去中心化的文件和文本消息传输工具，数据在两台电脑之间直接传输，不经过任何服务器中转，保证了极致的速度和隐私安全。
2.  **证件照排版工具**：一个智能的证件照排版工具，能将您自己的照片快速裁剪并排版成标准的 4x6 英寸打印模板，方便您随时打印。
3.  **PDF 水印添加工具**：一个简单易用的 PDF 处理工具，可以为您的 PDF 文件的每一页都添加上自定义的文字水印。

## 如何使用

1.  **安装依赖**：在项目根目录运行以下命令，下载项目所需的所有软件包。
    ```shell
    npm install
    ```
2.  **启动项目**：运行以下命令，启动本地开发服务器。
    ```shell
    npm run dev
    ```
3.  **访问应用**：在浏览器中打开命令行提示的地址（通常是 `http://localhost:5173`）即可开始使用。

## 核心功能详解

### 1. P2P 安全直连传输 (P2P Transfer)

此功能利用 WebRTC (PeerJS) 技术，在两个用户的浏览器之间建立一条点对点的加密隧道。经过重构，目前采用了**无阻塞高速流式传输机制 (64KB Chunk size without ACK)**，大幅提升了大文件的传输速度。

#### **基础连接与传输**
* **获取与连接**：进入 P2P 标签页后获取您的专属 ID。将 ID 发送给朋友，对方输入后点击 "Connect" 即可建立隧道。
* **文本与文件**：支持实时聊天和任意格式（无大小限制）的文件拖拽发送。

#### **🔐 极客隐私矩阵 (Privacy Matrix)**

ZeroDrop 提供三种不同级别的隐私保护模式，应对各种敏感场景：

* **断开即焚 (Disconnect After Download)**
    在发送文件时勾选此项，接收方下载完成的瞬间，P2P 连接将被**强制掐断**，不给任何网络嗅探或后续误传留有机会。

* **✨ “碟中谍”倒计时模式 (Mission Impossible Mode)**
    *适用场景：发送密码、API Key、钱包私钥等极度敏感的纯文本。*
    * **操作**：勾选输入框下方的 `Mission Impossible Mode` 后发送消息。
    * **效果**：对方收到的将是一个带有警示的黑框。点击“揭开”后，文字才会显示，并伴随一个 **10秒钟的红色倒计时**。时间一到，React 将直接执行内存擦除，界面显示“消息已物理擦除”，无法通过任何前端手段恢复。

* **✨ “长按显形”防偷窥模式 (Hold-to-Reveal Mode)**
    *适用场景：在办公室或公共场所接收私密照片、设计底稿，防备背后突然走过的人。*
    * **操作**：上传图片文件后，勾选 `Hold-to-Reveal Anti-Peep Mode` 并发送。
    * **效果**：对方将收到一张重度高斯模糊 (Blur) 的图片。用户必须**鼠标左键长按（或手机触屏长按）**，图片才会变清晰；一旦松手，立刻恢复模糊。
    * **终极自毁**：如果松手次数超过 3 次，或者总计查看时间超过 5 秒，文件对应的 Blob URL 将被执行 `revokeObjectURL` 彻底销毁，图片变成黑框并显示“Media destroyed”。

### 2. 证件照排版工具 (ID Photo)

专注于精确裁剪和排版的实用工具。
* 将上传的头像严格固定为 354x472 像素（一寸标准）。
* 一键生成包含 8 张照片、尺寸为 1800x1200 像素（300 DPI）的 4x6 英寸相纸排版图，方便去照相馆直接冲印。

### 3. PDF 水印添加工具 (PDF Tools)

为您的 PDF 文档批量添加防伪或标识水印。完全在本地前端利用 `pdf-lib` 渲染，您的商业机密文档绝不会被上传。
* 支持输入自定义水印文字（如 "CONFIDENTIAL"）。
* 自动为每一页平铺添加倾斜、半透明的红色水印，保证防伪效果且不影响正文阅读。

---

## 技术栈

*   **前端框架**: React
*   **构建工具**: Vite
*   **编程语言**: TypeScript
*   **样式方案**: Tailwind CSS
*   **P2P 通信**: PeerJS (WebRTC)
*   **PDF 处理**: pdf-lib
*   **图片裁剪**: react-cropper (Cropper.js)
