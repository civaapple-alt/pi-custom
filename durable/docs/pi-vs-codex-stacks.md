# pi 栈 vs codex 栈：分层对照

> 对照本地仓库：`D:\gh-ws\pi`（packages/agent、durable、chord）与 `D:\gh-ws\codex`（sdk/typescript、codex-rs/app-server-client）。
> 核心问题：agent 引擎与 harness 在两边的形态、嵌入方式、架构风格差异。

## pi 侧分层

```
pi-ai          模型/provider 抽象
pi-agent-core  ← packages/agent：有状态 agent 循环（消息/工具/事件流），npm 库形态
pi-durable     ← harness 构建 API（存储/task/checkpoint/并发对话）
chord          ← durable 底下的分布式状态引擎（通用库，非 agent 专属）
pi coding-agent← TUI 产品
```

注意：chord 是通用分布式对象库（不当 agent 看也能用），durable 才握着"会话/任务/checkpoint"这些 harness 语义。

## codex 侧分层（读完 README 的实际形态）

```
codex-core (Rust)   agent 循环 + 工具 + 恢复逻辑——但不对 JS 直接暴露
  ↑ 两种对外形态：
① @openai/codex-sdk (TS)  ← 不是库！是"spawn codex CLI 子进程 + stdin/stdout 传 JSONL"
   抽象：Thread / Turn / runStreamed / outputSchema
② app-server (JSON-RPC 协议/runtime)
   thread/start · thread/resume · thread/list · thread/read + 通知流
   传输：stdio / WebSocket（语言中立，可远程）
   └── app-server-client: 进程内客户端 crate，被两个产品用：
        codex-tui（终端） / codex-exec（无头脚本化，≈ pi 的 print 模式）
```

关键修正：`@openai/codex-sdk` 只提供 agent 层的 Thread/Turn 抽象（且是子进程封装，非进程内库）；**harness 能力在 app-server 层**（thread/resume/list），TS SDK 没有独立的 harness SDK。

## 对照表

| 层 | pi | codex |
|---|---|---|
| Agent 循环 | pi-agent-core（npm 库，进程内 import） | codex-core（Rust 内部，JS 只能经 ①子进程 或 ②协议 够到） |
| Harness（持久化/恢复/并发） | pi-durable（库） | app-server（JSON-RPC 协议 + runtime） |
| 嵌入方式 | `import` 进你的 JS 进程 | spawn CLI 子进程 / 连 app-server（可跨语言、跨机器） |
| 产品面 | pi coding agent（TUI）、`pi -p` | codex-tui、codex-exec |

## 核心架构差异：链路风格

同一件事的两种哲学：

| | pi 栈 | codex 栈 |
|---|---|---|
| 形态 | **库链接**：类型安全、零序列化、直接函数调用 | **进程/协议**：语言中立、进程隔离、天然可远程 |
| 代价 | 应用必须是 JS，且与 harness 同故障域（靠 durable 存储兜底） | 处处序列化边界（JSON-RPC envelope），热路径也有开销 |
| 远程/多语言 | 需自己包装 | 白送（stdio/WS 任选） |

角色对应：**app-server 在 codex 里的角色 ≈ durable 在 pi 里的角色**（都是"Harness 作为 API"），区别只是"协议 vs 库"。

## 选型推论

- 构建 **JS/TS 服务**（Node 后端里嵌 agent）→ pi 栈的库形态更顺（pi-agent-core 起步，要耐用上 durable）
- 要**语言中立/远程调用/进程隔离**（如 Python 服务驱动 agent）→ codex 的 app-server 形态；pi 侧无等价物，除非给 durable 自包协议层
- 只要**脚本里用一下** → 两边等价：`thread.run()` ≈ pi SDK/print 模式

## 延伸观察

pi 家族缺失"协议化 harness"形态。若将来给 durable 包一层 JSON-RPC（对话/任务操作映射为协议方法，存储做服务端），恰好补齐这块，且与 chord 的 link 抽象（memory/IPC/WebSocket）天然契合。
