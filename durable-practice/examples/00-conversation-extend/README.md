# 00-conversation 观察实验（扩展）

官方示例 `00-conversation.ts` 只打印一行 `{ id: 2 }`——Session/事务/账本全在内存里，"无感"。本目录的三个实验把同一机制**显形**。

运行（在 pi-custom 仓库根目录下）：

```bash
cd durable-practice
node examples/00-conversation-extend/01-atomicity.ts     # 实验 1：事务原子性
node examples/00-conversation-extend/02-jsonl-ledger.ts  # 实验 2：落盘账本
node examples/00-conversation-extend/03-context-cancel.ts # 实验 3：取消语义
```

## 实验 1：01-atomicity —— commit 的原子性

**观察点**：commit 回调里抛错，里面所有写入是否真被丢弃？

**预期输出**：

```
正常 commit 创建: { id: 2 }
commit 抛错被捕获: 故意失败
现存对话数（应为 1）: 1
```

**概念**：spec 不变量 1——一次 Session commit 跨所有记录与文档写入原子。失败 ≠ 写了一半，而是全部回滚。

## 实验 2：02-jsonl-ledger —— JSONL 落盘看账本 ⭐ 最直观

**观察点**：把 `MemoryStorage` 换成 `openNodeJsonlStorage`（子路径 `@earendil-works/pi-durable/storage/jsonl/node`），每次 commit 落一行到账本。

**预期输出**：

```
① 创建对话: 11
② 写入 notes = '第一笔'（同 commit 附一条 entry）
③ 写入 notes = '第二笔'
④ 文档最终值: { text: '第二笔' }
⑤ 该对话的 entry 数: 2
⑥ 时间旅行被后端拒绝: Document 13 does not retain historical content → 历史保留是后端配置项

══ session-data/ 账本 ══
  seq=8 conversation
  seq=9 entry+document.create
  seq=10 entry+document.change
doc-*.jsonl（文档的 chord 操作流）: doc-13.jsonl
```

**三个收获**：

1. **append-only 账本显形**：`main.jsonl` 每行一次 commit，seq 递增；entry 与文档变更打包在同一 commit（原子性的物证）
2. **文档是独立文件**：`doc-13.jsonl` 是该文档的 chord 操作流——文档状态和主账本分文件存储
3. **意外收获——时间旅行的代价**：`snapshotAsOf`（读历史时点的文档值）被后端拒绝，因为 JSONL 默认不留全部历史。**"时间旅行"是可选能力，取决于后端保留策略**——这与 spec 的 checkpoint/history 语义呼应，读 01-documents 官方示例（memory 后端无此限制）时可对照

**动手改**：打开 `session-data/main.jsonl` 逐行看 JSON 结构——`writes` 数组就是那次 commit 的原子单元。

## 实验 3：03-context-cancel —— context 的取消语义

**观察点**：`context` 就是 `{abortSignal}`；已取消的 signal 传给 commit，应该立即失败。

**预期输出**：

```
BACKGROUND_CONTEXT 下 commit 成功: 2
已取消的 commit 如预期失败: This operation was aborted
未取消的 context 正常: 3
```

**概念**：context 是贯穿所有 Session 调用的取消/超时通道（对应 chord 的 `BACKGROUND_CONTEXT`/`withCancel`）。Harness 里长任务取消子代理，就是 ownership（abort 传播）+ context（取消线）双重机制。

## API 备忘（踩坑记录）

写这三个实验时踩过的坑，都已在代码里修正：

| 错误用法 | 正确用法 |
|---|---|
| `session.scanConversations(...)` | `session.commit(tx => tx.scanConversations(...))` —— 扫描也在事务里 |
| `import { jsonlStorage } from "pi-durable"` | `import { openNodeJsonlStorage } from "pi-durable/storage/jsonl/node"` —— 存储后端在子路径导出 |
| `tx.set(doc, id, value)` | `session.commit(tx => { (await tx.doc(doc, id)).text = "..." })` —— 文档写入是"取可编辑副本 + commit 时保存" |
| `scanEntries({ conversation: id })` | `scanEntries({ conversationId: id })` —— 字段名以 spec/源码为准，勿凭直觉 |

这套 API 与官方示例（`test/examples`）一致——它们跑在仓库内所以走 `src/index.ts`，我们走 npm 包的 dist 导出，子路径规则以 package.json 的 `exports` 为准。
