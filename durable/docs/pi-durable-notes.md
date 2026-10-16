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

## 核心概念（依据 `docs/spec.md` 第 1 章 Terms）

```
Session（唯一变异线，原子提交单位）
├── conversation（transcript 作用域，可 fork）
│   └── run → turn（assistant 响应 + 其工具调用；turn 边界在 turns 之间）
├── entry（不可变 transcript 记录，提交后永不修改/复用 ID）
├── task（挂在某 conversation 上的耐用状态机）
├── submission（awaitable 宿主对象的后台记录，排队进 inbox）
└── document（可变 JSON 状态，由 Chord 操作 + 全量 base 表示）
```

逐条与 chord 的边界：**Session 才握 harness 语义**（会话/任务/checkpoint/submission/inbox），chord 只管 document 的表示与同步（Session 通过 source 把已提交的文档变更暴露给 chord，不暴露可变对象）。

### 必备不变量（spec 第 1 章，8 条）

1. 一次 Session commit 跨所有记录与文档写入**原子**
2. 文档更新仅在存储 commit 成功后发布
3. **所有可见进度皆耐用**——不存在易失发布路径
4. 外部副作用（网络/文件/子进程）不在 Session 变异事务内运行
5. entry 与 ID 不可变，提交后不复用
6. 文档 draft 在事务回调结束时全量撤销/落定
7. 变异线贯穿存储结算与已提交状态采用
8. 存储错误对打开的 Session **致命**（发布 nothing，必须重开）

### task 状态机（spec 第 5 章）

```
pending / running / waiting(on[], JoinPolicy) → completed / failed / aborted / orphaned / faulted
```

- `waiting`：停在某批 task 全部终态后于 checkpoint 恢复（`failFast` / `allSettled` 两种汇合策略）
- checkpoint 是每步先行落盘的状态，构成"崩溃续跑"的基础

### submission 与 inbox（spec 第 6 章）

- submission 支持 awaitable 宿主对象；入队由 Harness 内部管理，排队项存在内置 **inbox 文档**（有序列表，tag 区分 `steer` / `followUp` / `write`）
- 对话忙时（run 活跃）提交入队；run 任务用 `tx.settleSubmission()` 结算它应答的输入

### 明确的非目标（spec 第 13 章，节选）

- 无 CRDT/离线多写者合并（单 Session 单写者）
- 无自动 checkpoint 启发式、无自动第三方 view 挂载
- 无会话级可回滚文档、无 JSONL 全局压实/自动损坏修复
- 无进程内强制终止不协作的扩展代码

源码对应（`src/harness/`）：`harness.ts`、`submissions.ts`、`inbox.ts`、`task-graph.ts`、`agent.ts`、`compaction.ts`、`scheduler.ts`。

## 实验实证：02-jsonl-ledger 跑出来的五件事

以 `durable-practice/examples/00-conversation-extend/02-jsonl-ledger.ts` 的实测输出与 `session-data/*.jsonl` 账本为依据，验证 spec 概念如何落到文件：

### 1. commit = 原子打包（不变量 1 的物证）

`main.jsonl` 每行一个 commit，seq 递增。代码 ②③ 各做一次"entry + 文档变更"，账本上体现为同一 seq 的 `writes` 数组打包两个写入——**一次 commit 的 writes 就是原子单元**，失败即整行不存在。

### 2. entry 与 document 的分工（双文件结构）

- `main.jsonl`：`entry`（不可变事实，append-only）+ `document.create/change`（记录"哪个文档变了"，不含内容）
- `doc-N.jsonl`：该文档的 **chord 操作流**（内容本体）

分工：**entry 记"发生过什么"（永不改），document 记"现在是什么"（base+delta 演进）**。关联点是 commit seq——两者经 commit 绑定。

### 3. base / delta 是存储编码，不是 API

代码里只有 `(await tx.doc(notes, id)).text = "第二笔"`（对普通 JS 对象赋值）。`kind: "base"`/`"delta"` 是 commit 时 chord 的 diff tracker 自动选择：首次写入无旧版 → 全量 base；后续修改 → 最小差异 ops（如 `["s",["text"],"第二笔"]`）。**赋值是用户的事，diff 是库的事**。

### 4. history 两档语义（修正此前表述）

此前说"JSONL 后端默认最小保留"——**准确说法是 `history` 声明决定保留策略**（`src/storage/memory.ts` 的 `isCurrentOnly` 铁证）：

| `defineDoc` 的 `history` | 存储行为 | `snapshotAsOf`（时间旅行） |
|---|---|---|
| `"latest"` | base+delta，旧 base 可折叠回收 | ❌ 拒绝（"does not retain historical content"） |
| `"rewindable"` | 全量修订保留 | ✅ 可用（API 参数类型 `RewindableConversationDocToken` 编译期约束） |

实验中的 `demo.notes` 声明为 `latest` 却调 `snapshotAsOf`——运行期撞墙，正好验证该约束。取舍：**latest = 日志式文档**（聊天记录、inbox，历史是垃圾），**rewindable = 状态式文档**（计划、配置，时间旅行是合法需求），代价是体积只增不减。

### 5. seq 是全局账本坐标

entry、document、conversation 共用同一 seq 序列（`main.jsonl` 的 seq=1,2,3；`doc-4.jsonl` 的 seq=2,3 对应同两次 commit）——**seq 即"时间"**，`snapshotAsOf(entryId)` 本质是"解析 entry 的 commit seq，回放文档操作到该 seq"。

### API 备忘（实验踩坑，官方示例走 src 所以不触发）

| 误 | 正 |
|---|---|
| `session.scanConversations(...)` | `session.commit(tx => tx.scanConversations(...))`——扫描也在事务里 |
| `import { jsonlStorage } from "pi-durable"` | `import { openNodeJsonlStorage } from "pi-durable/storage/jsonl/node"`——存储后端在 exports 子路径 |
| `tx.set(doc, id, v)` | `tx.doc(doc, id)` 取可编辑副本，commit 时保存 |
| `scanEntries({ conversation: id })` | `scanEntries({ conversationId: id })`——字段名以 spec 为准 |

## 同名概念对照：durable vs pi coding agent

两个家族共享术语但定义强度不同——pi coding agent 的概念是**交互产品里的记账单位**，durable 的同名概念是**有 spec 保证的持久化实体**（有不变量背书）。混淆点集中在四个词：

| 概念 | pi coding agent（交互产品，见 pi-notes 第 11 节） | pi Durable（spec 第 1 章） |
|---|---|---|
| **session** | JSONL 会话文件 = 一棵消息树；进程死了文件还在，但**正在跑的 run 会丢** | Session = 唯一变异线，原子提交单位；**所有可见进度皆耐用**（不变量 3），崩溃后 resume 从断点继续 |
| **run** | 用户输入 → settle 的过程，N 个 turn；无持久化承诺，中断=计划丢失 | 从 admitted input 到 final answer 的 turn 序列，**run 本身是 durable task**——每个 turn 一个 checkpoint，中断可续 |
| **turn** | 一次 API 往返（响应+工具执行）；模型可以自由多批次 | spec 定义相同（一次 assistant 响应 + 其工具调用），但 turn **边界是持久化边界**：之间可挂暂停/提交点 |
| **副作用（side effect）** | 直接执行：工具调用即副作用，无重放语义；Esc 中止后状态可能半提交 | 不变量 4：**外部副作用不跑在 Session 变异事务内**；工具声明 `replay: "safe"` 才可崩溃后重跑，否则向模型报告中断、绝不盲重跑 |
| **排队消息** | steer/follow-up 内存队列，中止后退回输入框 | submission 记录进 inbox 文档（持久化），settle 恰好一次（requestId） |

### 一句话区分

- pi coding agent：概念服务**人**（对话、回滚、分支）
- durable：概念服务**可靠性**（每条概念都有"崩溃后世界长什么样"的答案）

同名的 session/run/turn，在 durable 里是带不变量的**持久化合同**；在 pi coding agent 里是**交互体验约定**。读 durable spec 时用 pi 的直觉做起点可以，但要随时用不变量校准强度。

## 词条：inbox / submission / task / checkpoint

四个词撑起 durable 的可靠性模型，精确含义（依据 spec 第 5、6 章）：

### submission（提交）

一条输入/写入的**可等待句柄**。向 conversation 发消息 = 创建 submission；宿主拿到可 await 的对象，对话应答后它 settle。`requestId` 保证**恰好一次**——客户端崩溃重试拿到的是原 submission，不会执行两次。

### inbox（收件箱）

对话忙时（run 进行中），后来的 submission **排队进一个持久化的内置文档**（有序列表），三种 mode：`steer`（插话，下 turn 前注入）/ `followUp`（后续，run 结束后注入）/ `write`（扩展写条目）。它是个 document——所以排队状态本身也抗崩溃，进程死了重启后队列原样还在。

对照 pi agent：steer/follow-up 只是内存队列，Esc 后退回输入框；durable 里它们是**落盘的合同**。

### task（任务）

挂在某个 conversation 上的**耐用状态机**。模型请求、工具调用、harness 运行的一切都是 task。状态机：

```
pending / running / waiting(on[], JoinPolicy)
    → completed / failed / aborted / orphaned / faulted
```

- `waiting`：挂起等待某批 task 终态，再于 checkpoint 恢复（`failFast` / `allSettled`）
- 归属（ownership）决定 abort 的传播：task 持有的子对话/子任务随父 abort 级联
- 无内置子代理——但工具拿到 harness API 几行就能造（子代理 = 它拥有的子 conversation）

### checkpoint（检查点）

task 的**持久化状态快照**，每步先行落盘。崩溃恢复 = 重开 Session → 找到未完成的 task → 各自从最后 checkpoint 继续：被截断的模型请求重发；工具按 `replay` 声明决定重跑或报告中断。

四者的关系：**submission 进 inbox 排队 → 被 run（task 的一种）消费 → run 的每一步先写 checkpoint → 崩溃后从 checkpoint 重建 task、从 inbox 重建队列**。环环相扣，缺一个可靠性就漏一块。

源码对应：`src/harness/submissions.ts`、`inbox.ts`、`task-graph.ts`、`scheduler.ts`。

## 词条：conversation / transcript / entry

durable 数据模型的三件套（依据 spec 第 1、2 章）：

### conversation（对话）

一个 **transcript 作用域**，可 fork 另一个对话。它不只是消息列表，还承载：

- 自己的 **agent 配置**：模型、思考档、启用的扩展与工具、额外指令、执行环境的工作目录
- 自己的文档集（inbox、计划、自定义状态）
- 归属（ownership）：决定 abort 传播范围——ownerless 的（如 Slack thread）abort 打不到它

fork = 新作用域看到父历史到分叉点为止，**不复制**（零拷贝派生）。

### transcript（会话记录）

对话内的**不可变记录序列**——不是"消息数组"这种内存结构，而是 append-only 的持久化账本。一次 run 写入的 turns、entries 按提交顺序排列；fork 的 transcript 与父共享前缀。

### entry（条目）

transcript 里的**单条不可变记录**。源码定义的类型（`src/entries.ts`）：

- `UserEntry` / `AssistantEntry` / `ToolResultEntry` —— 消息类
- `SystemEntry` —— 系统提示词与工具变更
- `CompactionEntry` —— 压缩摘要（保留边界）
- `ResetEntry` —— handoff/重置
- `CustomEntry` —— 扩展自己的 durable 数据（`pi.appendEntry()`，由 entry renderer 渲染，不进模型上下文——pi 的 observe 扩展信息流模式用的就是它）

另外 task 的落盘足迹（TaskStart/TaskEnd/Checkpoint 等）由 `src/tasks.ts` 的 task 状态机管理。

不变量 5：**entry 与 ID 不可变，提交后永不修改、ID 不复用**——写错了只能追加新 entry 声明废弃（与 pstack 的 append-only 决策日志同一哲学）。

三者的关系：**conversation 拥有 transcript；transcript 由 entry 组成；entry 不可变**。因此 fork（共享前缀零拷贝）、resume（重放 entry 重建状态）、审计（append-only 即完整历史）在 durable 里都是这个结构的直接推论。

源码对应：`src/entries.ts`（类型定义）、`src/session/`（conversation/transcript 作用域）、`src/harness/agent.ts`（run 如何写入 entry）。

## 词条辨析：durable 的 task 与 pi 的 run 是同一粒度吗？

**不是——这是 durable 设计里最微妙的粒度错位**（依据 spec 第 1、8 章）：

### 三个粒度的对照

| durable | pi agent | 粒度 |
|---|---|---|
| **run**（一次输入 → 最终答复的 turn 序列） | **run** | 相同：都是"回合"概念 |
| **内置 task**（`GenerationTask` / `ToolTask` / `CompactionTask`，spec 第 8 章） | **turn** | 相同：都是"一次模型请求 + 其工具批次" |
| **通用 task**（示例 24 的 checkout 收款、任意业务状态机） | —（无对应物） | durable 独有 |

### 命名错位

```
pi agent:  run ⊃ turn ⊃ tool call        （run 大，turn 居中）
durable:   run ⊃ task(内置) ⊃ tool call   （task 小，与 turn 同位）
           另有一个大粒度 task（通用/业务级）
```

pi 的 "turn" 在 durable 里叫 "task"——因为 durable 把一切都统一成 task 状态机（模型请求是 task、工具调用是 task、业务逻辑也是 task），**粒度对齐靠"内置 vs 通用"区分，而不是靠起两个名字**。

### 为什么容易把 task 和 run 对上

durable 给内置 task 设置了**自动续接**：一次 run 里第一个 GenerationTask 完成后，其产出自动 spawn 下一个（tool call → ToolTask → 结果 → 下一个 GenerationTask），一路链到最终答复。这个链的视觉感受就是"一个 run"——**大脑把"链"当成了实体，而实体是链上每个 task**。

### 通用 task 才是 durable 独有的王牌

pi agent 的 run 永远是 "agent 回合"；durable 的通用 task 是**任意业务状态机**：收款、定时任务、人工审批节点——与模型请求**活在同一个 task 图里**，共享 checkpoint / ownership / abort 语义。这就是 durable 能编排"agent + 非 agent"混合流程而 pi agent 不能的原因。

### 一句话修正

> "task 和 run 类似" → 修正为：**内置 task ≈ pi 的 turn；run 两边同义；通用 task 在 pi agent 里没有对应物**——它是把"任务"从 agent 回合里解耦出来后的泛化。

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
