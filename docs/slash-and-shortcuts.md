# Pi 常用 Slash 命令 & 快捷键速查

> 依据：官方 `slash-commands.md` / `keybindings.md` + 源码核对。
> 输入 `/` 可随时搜索当前会话所有可用命令（扩展和 skill 也会注册自己的命令）。
> 快捷键可用 `/hotkeys` 查看当前实际生效的绑定，改配置后 `/reload` 生效。

## 一、Slash 命令

### 会话与上下文（最常用）

| 命令 | 作用 |
|---|---|
| `/new` | 开新会话 |
| `/resume` | 会话选择器：切换/搜索/重命名/删除会话 |
| `/name [名字]` | 给当前会话命名（便于日后查找） |
| `/session` | 当前会话详情：路径、ID、消息数、token、费用 |
| `/tree` | 会话树导航：回任意节点分支（见下方快捷键） |
| `/fork` | 从早期某条提问分出新会话 |
| `/clone` | 复制当前状态为新会话 |
| `/compact [说明]` | 手动压缩上下文，可附带"保留哪些内容"的说明 |
| `/import <path>` | 导入 JSONL 会话文件 |

### 模型与设置

| 命令 | 作用 |
|---|---|
| `/model [provider/model]` | 切换模型 |
| `/thinking [level]` | 设置思考档位（off/low/high…） |
| `/login [provider]` | 添加 provider 认证（如 kimi-coding 订阅登录） |
| `/logout` | 移除 provider 认证 |
| `/scoped-models` | 配置 `Ctrl+P` 循环切换的模型集合 |
| `/settings` | 设置菜单（含 treeFilterMode 等） |

### 导出与分享

| 命令 | 作用 |
|---|---|
| `/copy` | 复制最后一条 assistant 回复 |
| `/export [path]` | 导出会话为 HTML / JSONL（浏览器通读长对话） |
| `/share` | 上传并生成查看链接（Radius 或私有 gist） |

### 运行时

| 命令 | 作用 |
|---|---|
| `/reload` | 重载 settings、扩展、skills、主题、keybindings（改配置后必用） |
| `/trust` | 保存项目信任决定 |
| `/bug [描述]` | 给 pi 开发者准备私有 bug 报告 |
| `/changelog` | 查看更新日志 |
| `/quit` | 退出 |

## 二、快捷键

### 对话回顾（全屏模式，治"滚屏找历史"）

| 键 | 作用 |
|---|---|
| `Ctrl+↑` / `Ctrl+↓` | 在**你的提问之间跳转**（Windows 直接可用） |
| `Ctrl+F` | 搜索对话内容（Windows；macOS 是 `Ctrl+Shift+F`） |
| `Enter` / `Ctrl+G` | 下一个匹配；`Shift+Enter` / `Ctrl+Shift+G` 上一个 |
| `PageUp` / `PageDown` | 按页翻动 |
| `Ctrl+Home` / `Ctrl+End` | 跳到开头 / 末尾并跟随新输出 |

### 输入框

| 键 | 作用 |
|---|---|
| `↑` / `↓` | 浏览已发送过的输入历史（光标在顶部时） |
| `Ctrl+G` | 打开外部编辑器写长输入（`$VISUAL`/`$EDITOR`） |
| `Ctrl+V`（Win 为 `Alt+V`） | 粘贴剪贴板文本/图片 |
| `Esc` | 中断当前生成 / 取消 |
| `Ctrl+C` | 清空输入框；再按退出 pi |
| `Ctrl+D` | 输入框为空时退出 |

### 消息队列（排队追问，不打断当前回答）

| 键 | 作用 |
|---|---|
| `Ctrl+Q`（Win；macOS `Alt+Enter`） | 把输入框内容排为 follow-up |
| `Alt+Q`（Win；macOS `Alt+↑`） | 把排队的消息取回输入框 |

### 模型与思考

| 键 | 作用 |
|---|---|
| `Ctrl+L` | 打开模型选择器 |
| `Ctrl+P` / `Alt+P` | 下一个 / 上一个模型（ scoped-models 集合内循环） |
| `Shift+Tab` | 循环思考档位 |
| `Ctrl+T` | 折叠/展开思考块 |

### /tree 树导航内

| 键 | 作用 |
|---|---|
| `Ctrl+U` | 只显示你的提问（纯问答列表） |
| `Ctrl+T` | 隐藏 tool 结果（保留提问+文字回复） |
| `Ctrl+L` | 只显示标记过的条目 |
| `Ctrl+A` / `Ctrl+D` | 全部 / 默认视图 |
| `Ctrl+O` / `Ctrl+Shift+O` | 循环切换过滤模式 |
| `Ctrl+←` / `Ctrl+→` | 折叠/展开分支段，或跳到上/下段 |
| `Shift+L` | 给节点编辑标签（之后可用 `Ctrl+L` 过滤只看标签） |
| `Ctrl+X` | 复制选中条目内容 |

### 其他

| 键 | 作用 |
|---|---|
| `Ctrl+O` | 折叠/展开 tool 输出块 |
| `Ctrl+X` | 复制最后一条 assistant 回复 |

### 会话选择器（/resume 界面内）

| 键 | 作用 |
|---|---|
| `Ctrl+P` / `Ctrl+S` / `Ctrl+N` | 切换显示路径 / 排序 / 只看已命名 |
| `Ctrl+R` / `Ctrl+D` | 重命名 / 删除会话 |

## 三、推荐默认设置（配合上面用）

```json
{
  "treeFilterMode": "no-tools",
  "branchSummary": { "skipPrompt": false }
}
```

- `treeFilterMode`：`/tree` 打开时的默认过滤（`user-only` 找问题 / `no-tools` 看问答）
- `branchSummary.skipPrompt`：设为 `true` 跳过 `/tree` 跳转时的 "Summarize branch?" 询问
