// 实验 2：JSONL 落盘 —— 把 MemoryStorage 换成文件存储，亲眼看 entry 账本
// 运行：node examples/00-conversation-extend/02-jsonl-ledger.ts
// 跑完去 durable-practice/session-data/ 打开 .jsonl 文件逐行看

import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import { createSession, defineDoc } from "@earendil-works/pi-durable";
import { openNodeJsonlStorage } from "@earendil-works/pi-durable/storage/jsonl/node";
import * as fs from "node:fs";

const session = createSession(await openNodeJsonlStorage("./session-data", BACKGROUND_CONTEXT));
const context = BACKGROUND_CONTEXT;

// 清理上一次的实验数据（观察干净）
fs.rmSync("./session-data", { recursive: true, force: true });

// 定义一个文档（notes），挂在对话上
const notes = defineDoc<{ text: string }>({
	kind: "demo.notes",
	version: 1,
	scope: "conversation",
	history: "latest",
	fork: "current",
	initial: () => ({ text: "" }),
});

// 三次 commit：建对话 → 写文档（tx.doc 返回可编辑副本，commit 时保存） → 再写
const conv = await session.commit((tx) => tx.createConversation({ ownership: { kind: "ownerless" } }), context);
console.log("① 创建对话:", conv.id);

await session.commit(async (tx) => {
	const entry = await tx.appendEntry(conv.id, { kind: "note", data: "第一笔" });
	(await tx.doc(notes, conv.id)).text = "第一笔";
	return entry;
}, context);
console.log("② 写入 notes = '第一笔'（同 commit 附一条 entry）");

await session.commit(async (tx) => {
	const entry = await tx.appendEntry(conv.id, { kind: "note", data: "第二笔" });
	(await tx.doc(notes, conv.id)).text = "第二笔";
	return entry;
}, context);
console.log("③ 写入 notes = '第二笔'");

// 读回最终值 + 该对话的 entry 扫描
const val = await session.snapshot(notes, conv.id, context);
console.log("④ 文档最终值:", val);

const first = await session.commit((tx) => tx.scanEntries({ conversationId: conv.id }, 20), context);
console.log("⑤ 该对话的 entry 数:", first.items.length);
for (const e of first.items) console.log("   entry:", e.id, "seq:", (e as { seq?: number }).seq, "kind:", (e as { kind?: string }).kind ?? "?");

// 时间旅行：读第一条 note entry 那个时点的文档值
// 注：JSONL 后端默认不留全部历史内容（历史保留是可配置选项），
// snapshotAsOf 可能抛 "does not retain historical content"——这本身就是个有价值的观察点。
const entries = await session.commit((tx) => tx.scanEntries({ conversationId: conv.id }, 20), context);
const noteEntry = entries.items.find((e) => (e as { kind?: string }).kind === "note");
if (noteEntry) {
	try {
		const asOf = await session.snapshotAsOf(notes, conv.id, noteEntry.id, context);
		console.log("⑥ 第一条 note entry 时点的 notes:", asOf, "（时间旅行成功）");
	} catch (err) {
		console.log("⑥ 时间旅行被后端拒绝:", (err as Error).message, "→ 历史保留是后端配置项");
	}
}

console.log("\n══ session-data/ 账本 ══");
for (const line of fs.readFileSync("./session-data/main.jsonl", "utf-8").trim().split("\n")) {
	const rec = JSON.parse(line);
	console.log(`  seq=${rec.seq}`, rec.writes.map((w: { type: string }) => w.type).join("+"));
}
console.log("doc-*.jsonl（文档的 chord 操作流）:", fs.readdirSync("./session-data").filter((f) => f.startsWith("doc-")).join(", "));
