# chord 是什么：通俗解读与生态现状

> 对应官方仓库 `packages/chord/README.md`（`@earendil-works/chord`）。
> 本篇回答三个问题：它到底管什么、不是什么（与常见中间件的边界）、这个包的生态值不值得投入。

## 一句话定位

**让同一个"对象"同时活在多个进程里，所有人看到的是同一个它。**

对象 = 一小份数据 + 操作这些数据的代码（如一个计数器、一个聊天室、一个待办清单）。对象住在一个地址上，按需创建，有引用才存活。

## 它管四件事

1. **引用而非实物**：各进程拿到的是同一对象的"遥控器"（引用），调方法效果一致；对象在哪个进程，调用方不用管
2. **状态同步**：数据变更后订阅者自动收到更新——先给快照，之后只给增量（delta）
3. **权限内建**：对象知道谁在调用（principal），主人和客人拿到的是不同方法面
4. **代码热换**：运行中替换对象内的代码——进行中的调用用旧代码跑完，状态保留，不兼容变更在安全点迁移

技术细节：契约用 TypeBox schema 运行时描述；进程间传 JSON 帧，链路支持内存 / Node IPC / WebSocket。气质接近 Erlang/OTP 的热代码加载 + actor 模型，用 TypeScript 与 JSON delta 追踪重做。

## 不是什么：分层对照

```
传统 SaaS                          pi 家族
─────────────────────────────────────────────────────
应用代码                          Durable 示例 / 你的应用
分布式对象/actor 运行时     ←→     chord        ← 这一层
通信/同步                   ←→     chord 的 links + delta
持久化（PG/MinIO/Redis）    ←→     Durable 的 storage 后端（SQLite/JSONL）
```

- **不是持久层**：不管数据存硬盘（进程全关对象就没了）；持久化由 Durable 在它下面补。PostgreSQL 若接入，也是通过 Durable 的 storage 接口扮演本来角色
- **不是消息队列**：chord 的"快照+增量"是状态复制（单一权威 → 订阅者），不是事件日志（事实 → 多个解耦消费者）；无 topic / 消费组 / 重放 / 削峰
- **不是注册中心**：reference 解析确实干了服务发现的活（README："callers never name a host"），但粒度是对象级（Nacos 是进程级），形态是嵌入式库而非独立集群，拿到的是活引用而非地址

## 真正的同类

| 同类 | 相似点 |
|---|---|
| **Cloudflare Durable Objects** | 最像："状态+代码在一个地址、按需创建、有引用才存活"——pi Durable 确实可跑在 CF DO 上 |
| Microsoft **Orleans** | 虚拟 actor：按需激活、引用透明、跨进程同 API |
| **Erlang/OTP** | 热代码替换、actor 隔离 |
| Firebase Realtime / Supabase Realtime | 只沾边（快照+增量订阅），但 chord 是双向方法调用不只是数据同步 |

国内常见中间件（Kafka、Nacos、Redis、ES）中没有同类。它们与 chord 不互斥，是共存的：Kafka 管业务事件流、Nacos 管服务发现、Postgres 管持久化、chord 管应用内部的活对象层。

## 在 pi 家族的位置

```
chord   ← 分布式对象/状态同步（最底层，通用库）
pi-ai   ← 模型 API 抽象
 ↑ 两者之上：
pi-durable    ← chord 的 replicatedState 做文档/视图/任务图 + 自己的存储/task 层
pi coding agent ← 主要用 pi-ai；TUI 独立
```

chord 是可独立使用的通用库，不只服务 Durable；但当前实际使用者基本就是 Durable。

## 生态现状

**基本没有独立生态**——它是 Earendil 团队为自己产品写的底层库：

- npm 下载量 ≈ pi 用户量，目前主要是 Durable 在用
- 无社区插件、无第三方教程、无周边工具链
- 文档质量高：仓库内 tutorial / guide / spec 三份；`src/delta/` 的事务式 JSON tracker 是精华

**投入建议**：当"pi 家族内部零件"看，不当需要投资学习的技术。

- 用 pi 终端写代码 → 碰不到
- 用 Durable 搭 agent 应用 → 它在底下工作，无需直接调用
- 值得看源码的时机：想学"多进程共享状态怎么设计"，delta 追踪部分值得抄思路

一句话：**chord 是 Durable 引擎室里的发动机——开车不用懂它，拆开能学到造车手艺。**
