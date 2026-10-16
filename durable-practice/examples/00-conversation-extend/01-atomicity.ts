// 实验 1：commit 的原子性 —— 回调抛错，里面所有写入全部丢弃
// 运行：node examples/00-conversation-extend/01-atomicity.ts
// 对应 spec 不变量 1：一次 Session commit 跨所有记录与文档写入原子

import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import { createSession, MemoryStorage } from "@earendil-works/pi-durable";

const session = createSession(new MemoryStorage());
const context = BACKGROUND_CONTEXT;

// 正常 commit：创建一个对话
const ok = await session.commit((tx) => tx.createConversation({ ownership: { kind: "ownerless" } }), context);
console.log("正常 commit 创建:", ok);

// 故意在 commit 回调里抛错：里面的创建应被丢弃
try {
	await session.commit((tx) => {
		tx.createConversation({ ownership: { kind: "ownerless" } });
		throw new Error("故意失败");
	}, context);
} catch (err) {
	console.log("commit 抛错被捕获:", (err as Error).message);
}

// 盘点：应该只剩 1 个对话（失败的那个没留下）
// 注意：scanConversations 在 commit 事务里（tx 上），不在 session 上
const page = await session.commit((tx) => tx.scanConversations({}, 10), context);
console.log("现存对话数（应为 1）:", page.items.length);
console.log("对话列表:", page.items.map((c) => c.id));
