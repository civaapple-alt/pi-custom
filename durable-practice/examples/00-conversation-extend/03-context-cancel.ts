// 实验 3：context 的取消语义 —— 贯穿所有 Session 调用的取消线
// 运行：node examples/00-conversation-extend/03-context-cancel.ts

import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import { createSession, MemoryStorage } from "@earendil-works/pi-durable";

const session = createSession(new MemoryStorage());

// BACKGROUND_CONTEXT：永不取消（官方示例都用它）
const ok = await session.commit((tx) => tx.createConversation({ ownership: { kind: "ownerless" } }), BACKGROUND_CONTEXT);
console.log("BACKGROUND_CONTEXT 下 commit 成功:", ok.id);

// 手动构造已取消的 AbortSignal 作为 context（chord 的 Context 即 {abortSignal}）
const cancelled = new AbortController();
cancelled.abort();
try {
	await session.commit((tx) => tx.createConversation({ ownership: { kind: "ownerless" } }), { abortSignal: cancelled.signal });
	console.log("意外：已取消的 commit 居然成功了");
} catch (err) {
	console.log("已取消的 commit 如预期失败:", (err as Error).message?.slice(0, 50) || String(err).slice(0, 50));
}

// 未取消的 signal 不受影响
const alive = new AbortController();
const ok2 = await session.commit((tx) => tx.createConversation({ ownership: { kind: "ownerless" } }), { abortSignal: alive.signal });
console.log("未取消的 context 正常:", ok2.id);

console.log("\ncontext = 取消/超时的传播通道（{abortSignal}）；Harness 里长任务取消子代理靠 ownership + context 双重机制");
