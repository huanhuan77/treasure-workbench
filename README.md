# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## 云备份（数据备份）

「数据备份」页会把全部数据同步到 **GitHub 私密 Gist**。配置时注意：

- Token 必须勾选 **`gist`** 权限（不是 `repo`）。若只用 `repo` 权限的 token，点「上传到云端」会报 **404**（GitHub 对缺 `gist` scope 的请求会伪装成资源不存在）。
- 生成路径：GitHub → Settings → Developer settings → Personal access tokens → 勾选 `gist` → 生成后粘贴到 App 的「GitHub Token」输入框。
- 上传失败报错含义：`401` = Token 失效；`403` = API 限流或缺少 `gist` 权限；`404` = Gist 不存在或 Token 缺少 `gist` 权限。
- 备份数据存于私密 Gist 文件 `treasure-workbench-backup.json`，即使重装 App 也可「从云端恢复」。
