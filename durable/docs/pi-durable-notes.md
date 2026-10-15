# Pi Durable 解读笔记

> 来源：[官方博客 Pi Durable](https://earendil.com/posts/pi-durable/)（2026-10-01 与 Pi 1.0 同步发布）
> 本笔记对照本地仓库 `packages/durable`（`README.md` / `src/`）整理。

## 定位

**Pi Durable 是一个"耐用"的 agent 框架**（实验性），与 pi coding agent（终端里人工驱动的编码工具）是姊妹产品：共享 pi-ai 等底层代码，目标是**构建"跑在哪都不死、谁来都能接管"的 agent 应用**——聊天机器人、多用户协作 agent、Slack 集成、长任务工人。

官方定位：pi coding agent 是"一个人在一台机器的终端里驱动；进程死了，人看看发生了什么然后让它继续"——**Pi Durable 把"人看看然后让它继续"变成架构能力**。

## 核心概念

```
harness（存储 + 运行机器）
└── conversation（对话，持久化实体，每个有自己的 agent 配置）
    └── task（harness 运行的一切都是 task：模型请求、工具调用……）
```

- **一切皆是 task，task 先行落盘**：每步执行前 checkpoint 已写入存储。进程死掉（合盖、容器重部署、OOM），新进程打开同一存储，`harness.resume()` 从断点继续
- **中断语义精确**：
  - 被截断的模型请求 → 重发
  - 部分答案 → 留在 transcript 标为 aborted
  - 工具调用被截断 → **声明了 `replay: "safe"` 的工具重跑**（如只读搜索）；没声明的（如 deploy）**永不重跑**，而是告诉模型"被打断，这是已有输出，你决定怎么办"
- **submission 恰好一次**：`requestId` 保证客户端崩溃重试不会重复提交

## 三个杀手锏（对照 pi coding agent）

| 能力 | pi coding agent | Pi Durable |
|---|---|---|
| 崩溃恢复 | 会话文件在，但 run 的计划丢了 | 每步 checkpoint，自动续跑 |
| 并发对话 | 单会话 | 单 harness 并发任意多对话，**fork 零拷贝**（线程看到父历史但不复制） |
| 执行环境 | 本机 | 存储与执行环境分离——harness 在 A 机器、工具在 B 机器（`env` 函数按对话构建） |

**子代理几行代码**：工具拿到 harness API 后自己开对话、配小模型、发任务、等答案——子代理也是普通 conversation，同样抗崩溃、自己记账成本。

**扩展即 bundle**：extension = 命名的一捆 system prompt sections + tools + hooks + tasks。prompt section 每次请求前重建（改动下个请求生效；支持中间改 system prompt 的模型只发 diff，缓存不失效）。

## 架构哲学

- **极简且 agent 可读**：全源码约 15,000 行（GPT 约 15 万 token），"built so your agent can understand it"——设计给 agent 自己读、自己改；存储后端单独约 3,000 行通常可跳过
- **存储可换**：memory / SQLite / JSONL 内置 + 一致性测试套件；SQLite/JSONL 实现不用 Node API，Bun / Cloudflare Durable Objects 加适配器即跑；接口小到能用 KV 或 Postgres 实现
- **内存友好**：常驻内存的只有活跃 transcript + live tasks，compaction 兜底，几万条消息的对话也住得下

## 本地仓库学习路径

`packages/durable/README.md` 目录与博客一一对应：

```
Persist and Resume → Task Graph → Abort and Subagents
→ Watching a Conversation → Storage → Your Own State
```

源码结构（`src/`）：`harness/`、`storage/`、`session/`、`tasks.ts`、`entries.ts`、`env/`、`tools/`、`codemode/`。

注意：包头部有 **Experimental** 警告，API 版本间不保证兼容。

## 延伸：与"可中断/可恢复运行"设计的关系

Pi Durable 的 checkpoint-per-task、`replay` 安全声明、exactly-once 提交，本质是把**"运行状态可恢复、可审计"**做成架构基石。这与交互层"观察/暂停/接管"（如 pi 的 steer、Esc、会话树分支）互补：交互层解决人机节奏问题，持久化层解决可靠性问题。
