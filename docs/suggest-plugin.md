# Pi 插件推荐（来源：https://pi.dev/packages）

> 抓取时间：基于 pi.dev/packages 目录 + npm registry 描述整理。
> 安装命令统一为：`pi install npm:<包名>`，装完 `/reload` 或重启生效。

## 补齐官方"刻意不做"的能力

| 包 | 干什么 | 适合谁 |
|---|---|---|
| `@narumitw/pi-plan-mode` | Plan mode：先出计划、审批后再执行 | 想要 Claude Code 式计划工作流 |
| `pi-subagents` | 子代理委托 + 多 agent 编排工作流（带 skill 和 prompt） | 复杂任务想并行/分工 |
| `pi-btw` | `/btw` 并行旁路对话，不打断主线 | 想边问边干 |

## 上下文 / token 优化

| 包 | 干什么 |
|---|---|
| `@zhushanwen/pi-smart-context` | 智能 compact：压缩时机交给 agent 自决，支持双模式压缩（同模型命中 KV 缓存 / 廉价模型），3 档阈值提醒 |
| `context-mode` | 号称省 98% 上下文的 MCP 插件，FTS5 知识库 + 意图搜索 |
| `pi-cache-optimizer` | 缓存优化 |

## 联网能力（kimi-coding 不带原生 web search 时有用）

| 包 | 干什么 |
|---|---|
| `pi-web-search` | provider 原生联网搜索（Gemini/Grok/OpenAI/Anthropic/DeepSeek 等） |
| `pi-web-access` | 全能款：搜索 + 抓 URL + 克隆 GitHub 仓库 + PDF 提取 + YouTube 视频理解 |

## 会话管理

| 包 | 干什么 |
|---|---|
| `@zhushanwen/pi-todo` | AI 驱动的 todo 列表，`/todos` 命令，会话持久化 |
| `@moyai/pi-session-hoarder` | 把 session 归档到本地内容寻址存储（防止越攒越多） |
| `pi-hashline-edit-pro` | 哈希锚定的 read/edit 工具，edit 工具不再"找错位置" |

## 其他

| 包 | 干什么 |
|---|---|
| `pi-powerline-footer` | powerline 风格状态栏（可改造默认底部状态栏） |
| `pi-simplify` | 自动审查最近改动的代码，提可读性建议 |
| `pi-claude-bridge` | 把 Claude Code (Agent SDK) 当 provider 用，附带 AskClaude 工具 |
| `@gotgenes/pi-permission-system` | 细粒度权限管控 |

## 起步组合（推荐先装这 3 个）

覆盖 pi 官方最小化设计留下的三个最常见缺口：任务管理、计划工作流、联网。

```bash
pi install npm:@zhushanwen/pi-todo
pi install npm:@narumitw/pi-plan-mode
pi install npm:pi-web-search
```
