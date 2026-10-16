# durable-practice：动手实验 durable & chord（示例 00–06）

从官方仓库 `packages/durable/test/examples` 复制的前 7 个示例（00–06），覆盖**无模型**的核心机制层。导入已从源码相对路径改为 npm 官方包（`@earendil-works/pi-durable@1.3.0` + `@earendil-works/chord@latest`），无需构建 pi 仓库即可运行。

## 快速开始

```bash
# 在 pi-custom 仓库根目录下
cd durable-practice
npm install          # 已装好则跳过
node examples/00-conversation.ts
node examples/01-documents.ts
# ... 依次
```

依赖：`@earendil-works/pi-durable`、`@earendil-works/chord`、`typebox`、`@earendil-works/pi-ai`（06 用到假模型）。

## 总览：这 7 个示例在教什么

```
00 conversation  → Session/transcript/entry 的组织方式 + 事务提交
01 documents     → 文档状态如何挂在 transcript 上，随历史回滚
02 forks         → 对话分叉：零拷贝派生 + 文档隔离
03 owned-conversations → task 持有子对话，归属(abort 传播)
04 chord-state   → chord 的响应式状态订阅（快照→增量）
05 watches       → chord watch 串行化异步文档工作
06 harness       → 完整骨架：registry/extensions/tools/Harness
```

概念地图（与 `../durable/docs/` 的笔记对应）：

- **Session**：唯一变异线，所有写入经 `session.commit(tx => ...)` 原子提交；回调抛错则全部丢弃
- **entry**：不可变 transcript 记录（`UserEntry`/`AssistantEntry`/`ToolResultEntry`/`CustomEntry`…）
- **document**：可变 JSON 状态，定义用 `defineDoc`（scope/history/fork 三要素），由 chord 操作表示
- **conversation**：transcript 作用域，可 fork；ownership 决定 abort 传播
- **chord**：文档的表示与同步引擎（replicatedState / source / watch）

---

## 00-conversation：Session 与事务

**运行**：`node examples/00-conversation.ts`
**输出**：

```
standalone conversation: { id: 2 }
```

**执行过程**：
1. `createSession(new MemoryStorage())` 开内存会话（不落盘，进程退出即消失；其他后端会落盘）
2. `session.commit((tx) => tx.createConversation({ownership: {kind:"ownerless"}}), context)` 创建对话
3. 打印返回的对话 ID（`{ id: 2 }`——1 被内部保留）

**关键概念**：
- **commit 即事务**：回调里的所有写入（对话、entry、task、文档）要么全部落盘要么全部丢弃——这是 spec 不变量 1 的体现
- **context**：每个 Session 调用都带（取消/超时）；`BACKGROUND_CONTEXT` = 永不取消
- **ownerless**：没有 task 创建它——没人"拥有"它，所以 abort 打不到它（对比 03 的 task 持有）

**动手改**：把 `MemoryStorage` 换成 JSONL/SQLite 后端（`jsonlStorage("dir")` / `sqliteStorage("file")`），重跑后查看目录里生成了什么文件。

---

## 01-documents：文档挂在历史上

**运行**：`node examples/01-documents.ts`
**输出**：

```
latest notes: { text: 'after goodbye' }
notes at first entry: { text: 'after hello' }
notes at second entry: { text: 'after goodbye' }
```

**执行过程**：
1. 定义文档 `notes`（`defineDoc`：scope=conversation, history=latest, fork=current）
2. 在 turn 1 写入 `{text:"after hello"}`，turn 2 写入 `{text:"after goodbye"}`
3. 从三个视角读：最新值 / 第一个 entry 处的历史值 / 第二个 entry 处的历史值

**关键概念**：
- **文档的"时间旅行"**：`history: "latest"` 的文档，每个 entry 位置都对应一份历史快照——读"entry N 处的值"就是回到那个时间点
- **文档 vs entry 的分工**：entry 不可变（事实账本），document 可变（当前状态）——状态变化以文档形式存在，事实以 entry 记录
- 这正是 durable 能给 `/tree` 式回退提供状态的原因（对比 pi agent 的回退只回消息不回状态）

**动手改**：在两次写入之间加一个 `session.commit` 写入一条 CustomEntry，再读该 entry 处的 notes 值——验证文档快照随 entry 走。

---

## 02-forks：分叉与隔离

**运行**：`node examples/02-forks.ts`
**输出**：

```
fork transcript: [ 'hello' ]
fork notes: { text: 'after hello' }
fork notes after edit: { text: 'changed only in the fork' }
parent notes after edit: { text: 'after goodbye' }
```

**执行过程**：
1. 父对话写 notes = "after goodbye"
2. `fork` 出一个子对话（在"hello"那个 entry 处）
3. 子在 fork 点看到的是旧值 "after hello"（**不复制**，读时解析）
4. 子改 notes，父不受影响；父的后续状态子也看不到

**关键概念**：
- **零拷贝 fork**：子对话共享父的 transcript 前缀，只存分叉点指针——spec 里 `fork: "current"|"initial"` 控制文档继承哪个版本
- **文档隔离**：fork 后父子的同名文档独立演化——这就是"主 agent 开子代理互不干扰"的底层
- 对比 pi agent 的 `/fork`：pi 的 fork 复制消息树但**状态不跟随**；durable 的 fork 连文档状态都能精确回到分叉点

**动手改**：把 `defineDoc` 的 `fork` 从 `"current"` 改成 `"initial"`，观察 fork 后子对话的 notes 初值变化（initial = 继承初始快照而非当前值）。

---

## 03-owned-conversations：归属与 abort 传播

**运行**：`node examples/03-owned-conversations.ts`
**输出**：

```
child conversation: { id: 4, owner: { conversationId: 2, taskId: 3 } }
registry: {
  agents: {
    researcher: { conversationId: 4, requestId: 'researcher:first-message:3' }
  }
}
```

**执行过程**：
1. 定义一个 `defineTask`（长驻"研究员"task）
2. task 运行时创建子对话，ownership 指向 `{conversationId, taskId}`——**task 拥有它**
3. 通过 registry 文档登记"researcher → 子对话 ID + submission requestId"

**关键概念**：
- **ownership 是 abort 的传播边**：父 task 被 abort → 它拥有的子对话/子任务级联中止；ownerless 的则不受影响
- **requestId 恰好一次**：`'researcher:first-message:3'` 这样的 ID 保证崩溃重试不会重复创建——对应 spec 的 submission 语义
- 这是"子代理"的最小骨架：task 持有子对话 + registry 寻址（示例 22/23 的完整版）

**动手改**：尝试在 task 外直接 abort 父对话（`tx.abort...` 或 context cancel），观察子对话是否级联中止。

---

## 04-chord-state：chord 的响应式订阅

**运行**：`node examples/04-chord-state.ts`
**输出**：

```
Chord notes: hydrate 0 { text: 'first' }
Chord notes: update 1 { text: 'published through Chord' }
```

**执行过程**：
1. 用 chord 的 `replicatedState` 包一层文档 source
2. 订阅者先收到 **hydrate**（完整快照，`0` 是修订号）
3. 文档变更后收到 **update**（`1` 是新的修订号）——只有变化部分在传输

**关键概念**：
- **快照 → 增量**：chord 的状态同步协议。远程 UI（示例 21 late-join）就是靠这个：先进来拿快照，之后只收 ops
- **source 单向暴露**：Session 把"已提交的文档变更"通过 source 喂给 chord，但不暴露可变对象——写永远走 Session 事务（不变量 2：存储 commit 成功后才发布）
- 对应 `chord-explained.md` 里"state 可观察 JSON：快照+delta"

**动手改**：加第二个订阅者，在第一个订阅后中途加入——验证它先收到 hydrate（最新值）而非从头重放。

---

## 05-watches：异步工作串行化

**运行**：`node examples/05-watches.ts`
**输出**：

```
watch baseline: { text: 'first' }
watch update: { text: 'observed asynchronously' }
```

**执行过程**：
1. 定义带 **watch** 的文档——watch 是"文档变化时触发的异步工作"
2. 修改文档 → watch 回调被异步触发（不在 commit 事务里——不变量 4：外部副作用不进事务）
3. watch 内再改文档 → 触发下一轮观察

**关键概念**：
- **watch = 文档的事件钩子**，但运行在事务外（副作用安全）
- **串行化**：同一文档的多个 watch 排队执行，不并发——避免写冲突
- 典型用途：文档变了→触发重建索引、通知订阅者、启动下游任务

**动手改**：在一次 commit 里连续改两次文档，观察 watch 触发次数——验证"每次发布一个原子修订，watch 每修订触发一次"。

---

## 06-harness：完整骨架（含假模型）

**运行**：`node examples/06-harness.ts`
**输出**：

```
root: 1 { text: 'root notes' }
stored agent: { thinkingLevel: 'low' }
resolved: low [ 'files' ] [ 'read' ]
```

**执行过程**：
1. `createRegistry()` + 安装扩展（defineExtension：sections + tools）
2. `Harness.open(storage, {models, registry, env})` —— 比裸 Session 高一层：自带模型、扩展、环境
3. `harness.root()` 拿根对话；写入文档；查看/修改 per-conversation agent 配置
4. 解析"对话当前有哪些工具可用"（`files` 命名空间下的 `read`）

**关键概念**：
- **Session vs Harness**：Session 是存储+变异线（机制层）；Harness 是会话+模型+扩展+环境的组装（应用层）。写产品用 Harness，写底层测试用 Session
- **agent 配置存在对话上**：模型、思考档、启用的扩展/工具——每个对话可以不同（示例 28 reviewer 的便宜模型就靠这个）
- **env 函数**：`({cwd}) => new NodeExecutionEnv({cwd})`——每个工具调用按对话的工作目录构建执行环境（跨机器执行的挂钩点）

**动手改**：在扩展里再加一个 tool，重新解析工具列表；或把 thinkingLevel 改成 `"high"` 再读回。

---

## 学习路径建议

1. **先跑通再改**：每个示例原样跑一遍，对照本 README 的解释
2. **带着问题改**：每节的"动手改"是最小实验，做完你对该机制的理解会超过看十遍文档
3. **往回对照概念**：跑 02 时翻 `../durable/docs/pi-durable-notes.md` 的"数据模型三件套"；跑 03 时翻"可靠性四件套"
4. **下一步**：00–06 是无模型机制层；跑顺后可以挑战 13-recovery（崩溃恢复）和 23-subagent-background（进程重启续跑），那才是 durable 的"哇"时刻——但建议把 00–06 的概念嚼烂再去
