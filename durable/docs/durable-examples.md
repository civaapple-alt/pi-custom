# Pi Durable 示例目录（test/examples 00–31）

> 对应官方仓库 `packages/durable/test/examples/`，编号即学习路径，分四层递进。
> 运行方式（在 `packages/durable` 目录下）：
> ```bash
> node --conditions=source --experimental-strip-types test/examples/NN-xxx.ts
> ```

## 第一层：核心概念（00–13，无模型，纯机制）

| 示例 | 场景 |
|---|---|
| 00-conversation | Session 里有什么：对话、transcript、task、document 的存储模型 |
| 01-documents | 把文档状态存在 transcript 条目旁边（扩展自己记账的基础） |
| 02-forks | 对话分叉：thread/分支的零拷贝派生 |
| 03-owned-conversations | 后台 task 持有子对话——归属关系决定 abort 的传播范围 |
| 04-chord-state | 通过 Chord 暴露文档状态（响应式文档） |
| 05-watches | 用 watch 串行化异步文档工作（并发写保护） |
| 06-harness | 打开 Harness + 注册扩展的最小骨架 |
| 07-configuration | 每个对话独立的模型/思考档选择 + Harness 级设置 |
| 08-harness-conversations | 对话句柄、类型化条目、创建与 fork 的 API 面 |
| 09-context | transcript 历史 vs 模型上下文的关系 |
| 10-registry-reload | 运行中热重载扩展代码（类似 pi 的 `/reload`） |
| 11-extension-state | 扩展维护自己的 per-conversation 文档（自定义状态的样板） |
| 12-tasks | 跑一个耐用 task（一切皆可 task 的最小演示） |
| 13-recovery | **关闭→重开→断点续跑**——Durable 的立身之本，必看 |

## 第二层：交互模式（14–21，接入真实模型）

| 示例 | 场景 |
|---|---|
| 14-chat | 一轮问答的最小 chat（假模型，无需 key） |
| 15-system-prompt | system prompt 分节 + per-conversation 指令注入 |
| 16-real-model | 接 OpenAI 流式回答（第一个需要真实 key 的） |
| 17-coding-tools | **模型读文件/改文件/跑命令的完整一轮**（JSONL 存储，留目录可检查） |
| 18-print | 等价 `pi -p`：提交一个 prompt 打印答案（CLI 嵌入场景） |
| 19-json | 等价 `pi --mode json`：事件/原始 view 帧两种 JSON 流（接管道/服务） |
| 20-inbox | **对话忙时提交怎么排队**：steer、follow-up、撤回——多人驾驶同一 agent 的语义 |
| 21-late-join | 中途加入：先拿快照，之后只收增量（旁观/第二个客户端接入） |

## 第三层：Agent 编排模式（22–25）

| 示例 | 场景 |
|---|---|
| 22-subagent-foreground | 前台子代理：调用持有子对话、跑一个任务、返回答案；abort 级联；UI 在调用下展示子代理事件 |
| 23-subagent-background | **持久后台子代理**：命名/spawn/steer/stop/list，主 agent 答用户时子代理继续干活，答案到了自动回报；**演示中途关进程重启** |
| 24-child-tasks | 任务图：一个 checkout 并发收 4 笔款并等待——failFast/abort/重启恢复，最接近真实业务编排 |
| 25-compaction | 长对话的三种压缩：后台自动 / 手动 / 上下文溢出后 |

## 第四层：成品形态（26–31，直接可抄的应用）

| 示例 | 场景 |
|---|---|
| 26-coding-agent | **迷你 pi coding agent**：内置编码工具 + 感知 cwd 的 prompt + 设置文件 + 跟随对话目录的环境 |
| 27-plan-mode | 计划模式：切只读规划态 → agent 把计划写进扩展文档 → 切回恢复全部工具 |
| 28-reviewer | 主 agent 旁边的**评审 agent**：更便宜的模型、只读工具、独立 checkout——多模型分工的最小实现 |
| 29-sandbox-per-conversation | 每个对话独立沙箱：文档记录沙箱、env 函数按对话查容器（托管产品的隔离模型） |
| 30-tool-override | 按对话替换/装饰工具：venv 里的 bash + 计时包装器 |
| 31-reload-and-restart | 扩展热更 + 进程重启的组合拳：**跑着的调用用旧代码跑完，重启后名字重新绑新代码** |

## 建议动手顺序

1. `13-recovery` —— 一分钟理解"耐用"到底指什么
2. `23-subagent-background` —— 最有"哇"效果的（中途 kill 进程再续）
3. `27-plan-mode` + `28-reviewer` —— 与 approve 审批 / 多模型分工直接对应
4. `26-coding-agent` —— 完整应用长什么样
