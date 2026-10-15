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

## 与 pi coding agent 的关系层级（辨析）

**两者是平级姊妹，不是上下层**：共享 pi-ai、chord 等底层包，各自是独立产品。证据：官方说 Durable 的经验会 "flow back into the Pi coding agent"——若 Durable 是下层则不存在"回流"。

```
pi-ai / chord 等共享底座
   ┌────┴─────┐
pi coding agent   pi-durable
终端应用（人用）    库/框架（开发者 import 用）
   ↑                  ↑
pi extensions     你自己的应用
（装包扩展它）     （import 它构建，不是插件）
```

**不存在"用 Durable 做 pi 的 extension 再安装"这条路径**。选型互斥：

| 目标 | 路径 | plan mode 的形态 |
|---|---|---|
| 在 pi 终端里加功能 | pi extension（`pi install` 装包） | 装在 pi 里的第三方包 |
| 构建自己的产品（Slack 机器人/托管 agent/多用户服务） | Durable 应用（import 库写程序） | 自己应用里的一段代码（示例 27） |

示例 26 甚至演示了用 Durable 造一个迷你 pi coding agent——说明它俩同层：Durable 能造出 pi agent 这类东西，而非寄生其中。

## 示例为何覆盖 subagent / plan mode（示例 ≠ 内置）

**纠偏**：Durable 同样不内置这些功能——博客原话 "Pi Durable has no built-in subagents, but they take a few lines of code to build"。27/22/23/24 号示例是 `test/examples/` 里的**参考实现**，是教学材料，不承诺 API 稳定、不做功能维护。

**框架的示例 ≠ 产品的内置功能**。

| 模式 | 在 Durable 上 | 在 pi coding agent 上 |
|---|---|---|
| 子代理 | harness API 几行：`createConversation`+`submit`+`wait`；并发/归属/抗崩溃免费 | 无"第二个会话循环"原语，要自己造（pi-subagents 插件是项目级实现） |
| 子任务 | task 图原生结构，ownership 决定 abort 传播 | 无 task 概念，只有消息树 |
| 计划模式 | `configure({tools:{remove:[...]}})` 一行切只读 + 扩展文档存计划 | 可拼（第三方 plan-mode 包），但需自建工具暴露控制 |

准确说法：这些模式在 Durable 上是**原语的自然组合（composition）**，在 pi agent 上是**与 harness 搏斗（construction）**——Durable 把对话/任务/归属/checkpoint 做成了 API 表面的主角，功能便"浮现"出来。

**两种"不做"是同一种哲学**（harness 做薄，模式做散）：核心只保证原语最小且完备，模式层永远留给上层。区别只在受众：pi agent 的上层是插件生态（装包），Durable 的上层是应用开发者（抄示例改吧改吧）。官方宁可写 20 个示例也不把 subagent 焊死进核心——一旦焊死就失去被改造的可能。pi coding agent 的 README 亦明言："skips features like sub-agents and plan mode. Ask Pi to build what you want, or install a package that does it your way."。
