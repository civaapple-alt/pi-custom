# Pi 使用笔记

> 整理自对 pi 源码（`dist/bundle`）与官方文档的核对。

## 1. 底部状态栏

```
↑2.7k  ↓1.3k  R24k  CH88.7%  $0.012 (sub)  0.5%/1.0M (auto)    (kimi-coding) kimi-for-coding • high
```

| 显示 | 含义 |
|---|---|
| `↑2.7k` | 输入 token 累计（会话总 prompt tokens） |
| `↓1.3k` | 输出 token 累计 |
| `R24k` | 缓存读取（cache read）：命中缓存、复用的 prompt tokens |
| `Wxx` | （未显示则为 0）cache write，写入缓存的 tokens |
| `CH88.7%` | 缓存命中率 = cacheRead ÷ (input + cacheRead + cacheWrite)，基于最近一条 assistant 消息 |
| `$0.012 (sub)` | 会话累计费用；`(sub)` = 订阅计费（如 kimi-coding），非按量 API |
| `0.5%/1.0M (auto)` | 上下文已用比例 / 窗口总大小；`(auto)` = 自动压缩开启 |
| 右侧 `(provider) model • high` | provider、模型名、thinking 档位 |

- 只有非零项才显示，所以新会话左边是空的。
- 上下文占比变色：>70% 警告色，>90% 错误色。

## 2. 查看所有 session

- 交互模式 `/resume` → 会话选择器（可搜索/重命名/删除/显示路径）
- 启动时 `pi --resume` 打开选择器；`pi --continue` 直接续最近会话
- 存储目录：`~/.pi/agent/sessions/`（Windows：`C:\Users\<用户>\.pi\agent\sessions\`），按工作目录分组
- `/session` 查看当前会话详情（路径、ID、消息数、token、费用）

### 快速回顾对话（不用滚屏）

- `Ctrl+↑` / `Ctrl+↓`（或 `Ctrl+Shift+↑/↓`）：全屏模式下在**你的提问之间直接跳转**
- `Ctrl+F`（Windows）：搜索对话内容，Enter 跳下一个匹配
- `PageUp` / `PageDown`：按页翻动对话
- `/export`：导出 HTML，浏览器里通读长对话
- `/tree` + 过滤键：见第 3 节的视图过滤

## 3. 会话的树结构：/tree、/fork、/clone

pi 把会话存成**树**，回到早期节点不会删除后续分支。

| 命令 | 行为 |
|---|---|
| `/tree` | 在当前会话文件内导航；选中任意条目跳转 |
| `/fork` | **任选一条早期 user 消息**，把它之前（含）的历史**复制**到新会话文件 |
| `/clone` | 把**当前活动分支最新状态**整体复制为新会话 |

要点：

- fork/clone 都是**物理复制**，新会话 `/tree` 能看到复制来的历史；原会话 fork 点之后的内容不在其中（文件头只记录 `parentSession` 路径，pi 不会跨文件加载）。
- fork 后两个会话完全独立。

### /tree 里的 tool 条目

树中每个条目都是节点：user 消息、assistant 消息（含 toolCalls）、toolResult。选中任何节点（包括 tool 结果）都能分支：

- 选中 **user 消息** → 文本回填输入框，修改再发 = 创建分支
- 选中 **assistant 回复 / tool 结果等** → 从该节点之后继续，输入框为空

跳转后发给模型的是**该节点为止的分支前缀**，旧分支后续 tool 不会自动重跑——模型基于当时状态 + 你的新指令重新决定。

### /tree 视图过滤（解决 tool 条目刷屏）

`/tree` 界面内直接按键过滤：

| 按键 | 模式 |
|---|---|
| `Ctrl+T` | 隐藏所有 tool 结果（no-tools） |
| `Ctrl+U` | 只显示你的提问（user-only）——干净的问答列表 |
| `Ctrl+L` | 只显示标记过的条目 |
| `Ctrl+A` | 显示全部 |
| `Ctrl+D` | 默认视图 |
| `Ctrl+O` / `Ctrl+Shift+O` | 循环切换 |

常用组合：`/tree` → `Ctrl+U` 找问题、`Ctrl+T` 看回答。想设为默认：settings.json 加 `"treeFilterMode": "user-only"`（或 `"no-tools"`），`/reload` 生效。

### "Summarize branch?" 提示

`/tree` 选中节点后固定弹出（离开当前分支前的询问）：

| 选项 | 效果 |
|---|---|
| No summary | 直接跳走，旧分支留在树里但新分支不携带其成果 |
| Summarize | 模型总结旧分支工作，作为 `branch_summary` 条目挂到跳转点，新分支上下文带上摘要（省 token 不丢结论） |
| Summarize with custom prompt | 同上，可指定摘要重点 |

- Esc = 取消跳转，回到 tree 选择
- 选中当前位置则提示 `Already at this point`
- 想永久跳过：settings.json 加 `"branchSummary": { "skipPrompt": true }`

## 4. /share 的分享机制

流程（源码 `shareSession`）：

1. **优先 Radius**：已配置 Radius 认证时，POST `https://radius.pi.dev/v1/artifacts`（organization 可见），返回 `artifact.canonical_url`，不创建 gist
2. **否则回退 gist**：要求本机装有 GitHub CLI
   - `gh auth login` 登录自己的账号
   - 执行 `gh gist create --public=false session.html` → 在你的账号下创建**私有 gist**

两个链接的分工：

| 链接 | 角色 |
|---|---|
| `https://pi.dev/session#<gistId>` | 查看器（静态前端），本身不存数据 |
| `https://gist.github.com/<你>/<gistId>` | 数据真正存放处 |

- 打开 pi.dev 链接时，页面 JS 根据 `#gistId` 去 gist.githubusercontent.com 拉数据并渲染
- gist ID 放在 URL `#` 片段中，不经过任何服务器，纯浏览器端请求
- 只发 `pi.dev/session`（不带 `#gistId`）打开是空的
- **分享发 pi.dev 链接；撤回分享去 gist 页面删除 gist**

## 5. 目前没有的：handoff

- 没有 `/handoff` 命令或交接功能（唯一相关字样是 provider 测试文档里的 "cross-provider session handoff"，指适配层测试场景）
- 替代方案：
  - 交接给新会话：`/clone` / `/fork`
  - 交接给人/别的机器：`/export`（HTML/JSONL）、`/share`（链接）、`/import <path>`（导入恢复）
  - 跨 provider 继续：直接 `/model` 切换，session 与 provider 无关

## 6. 联网搜索与网页抓取

推荐插件 **`pi-web-access`**（已在本机安装验证）：

```bash
pi install npm:pi-web-access
```

- 安装位置：`~/.pi/agent/npm/node_modules/`，pi 启动时自动发现加载
- 提供工具：`web_search`（搜索）、`fetch_content`（抓 URL 转 markdown，还能处理 GitHub 仓库/PR、YouTube 视频、PDF）
- provider 选择：
  - `kimi` —— 复用 `/login kimi-coding` 的 Kimi Code 订阅，零额外费用
  - `exa` —— 读取环境变量 `EXA_API_KEY`（零配置），也支持 Brave / Tavily / Jina / Kagi 等几十家
  - `auto`（默认）—— 自动选择可用 provider
- 用法：自然语言"搜一下 xxx"即可，模型自动调用；显式指定如 `web_search({ query: "...", provider: "kimi" })`

注意：pi 核心不认识 `EXA_API_KEY` 等搜索密钥，必须靠此类插件接入。Kimi 官方的 `$web_search` 内置工具已宣布 2026-10-20 下线，替代方案就是独立搜索接口或本插件。

## 7. /reload

安装/修改扩展、skill、主题、keybinding 等资源后，**无需重启** pi，输入：

```
/reload
```

作用范围（官方定义）：重新加载 keybindings、extensions、skills、prompt templates、themes 和 context files。

要点：

- 扩展运行时会整个替换，旧运行时的状态不能跨 reload 保留（扩展代码里 `await ctx.reload()` 之后不能复用旧状态）
- 对扩展源码的修改，改完 `/reload` 即生效（不用退出 pi）
- 只会话消息树不动，reload 不影响当前对话上下文
- **settings.json 改动也能生效**：reload 会重读全局（`~/.pi/agent/settings.json`）和项目级（`.pi/settings.json`）两份配置，并重置 provider（`resetApiProviders`）。常规设置（provider、compaction、主题、行为开关）无需重启；仅个别启动期一次性读取的选项（如终端能力检测）不保证，没生效就重启

## 8. 插件与 skill 推荐

- [suggest-plugin.md](./suggest-plugin.md) — pi.dev 插件精选
- [skill-recommendations.md](./skill-recommendations.md) — skills.sh / skillhub.cn skill 精选

## 9. 其他速查

- [slash-and-shortcuts.md](./slash-and-shortcuts.md) — 常用 slash 命令与快捷键速查表
- [pstack.md](./pstack.md) — pstack 技能包的选择、安装与使用

## 10. 案例：welcome 扩展从需求到删除（需求先查内置）

**需求**：欢迎页只在启动/reload 时显示一次，想要个 `/welcome` 命令随时查看当前 resources，并在 reload 后核对改动是否生效。

**过程**：

1. 调研扩展 API：`pi.registerCommand()` 注册命令，`ctx.ui.setWidget(key, lines, {placement:"aboveEditor"})` 可在输入框上方展示文本面板（`~/.pi/agent/extensions/welcome.ts`）
2. 实现内容：当前模型/thinking、skill 名单 + ●（自动触发）/○（显式调用）+ 来源目录、扩展文件/npm 包/settings 配置
3. 实测可用（34 skills 全列出，来源标记正确），但 widget 有高度限制会截断长列表
4. 用户贴出欢迎页后才发现：欢迎页提示 **"Press ctrl+o to show full startup help and loaded resources"** —— `Ctrl+O` 本身就是内置的随叫随到资源查看器（`app.tools.expand` 键位，空闲时呼出）
5. 结论：内置 `Ctrl+O` 已覆盖需求，删掉扩展，恢复只用 `kimi-auto-router.ts`

**经验**：

- pi 内置能力比表面多：想要功能时先看启动帮助（`Ctrl+O`）、`/hotkeys`，或直接在会话里问 pi"有没有内置 XX"
- `/welcome` 相对内置列表的唯一增量是 ●/○ 自动触发状态和来源目录——若将来需要验证 skill 的 `disable-model-invocation` 改动，可考虑重新加回

## 11. 概念辨析：session / run / turn / tool（批次）

这组概念在 Observe Mode 的讨论中反复出现，层级关系：

```
session（会话，持久化的树）
└── run（一次运行：用户输入 → agent 干完 settle）
    └── turn（一轮：一次 LLM API 请求的响应周期）
        └── tool call（工具调用，最小执行单元）
```

### tool（工具调用）

模型可调用的最小执行单元：`read` / `bash` / `edit` / `codemode` …
一次调用 = 一次副作用 + 一个 toolResult 记录。
特例：codemode 是"套娃"——1 个 tool call 内部由脚本驱动多个**嵌套调用**（事件带 `parentToolCallId`，结果存父调用的 `nestedCalls`），但对 turn 结构而言仍算 1 个调用。

### turn（轮次）= 一次 API 请求

一次完整的 LLM 请求-响应周期。pi 的结构（M2 探针实测时序）：

```
请求 → 模型响应（文字 + 0..n 个 tool call）→ 执行工具 → 记录 toolResult
→ turn_end 事件 → 若有待处理结果则发起下一个请求（下一个 turn）
```

- 一个 turn 内模型输出**文字 + 一批工具调用**，这批调用共享同一个意图
- **批次（batch）= 一个 turn 内的 tool call 集合**，是 Observe Mode 的观察单元
- `turn_end` 事件在每个 turn 结束时触发（payload 含 message/toolResults/turnIndex），挂暂停点的位置

### run（运行）

从一条用户输入触发、到 agent settle 的完整过程 = N 个 turn 的序列。

- `before_agent_start` 事件 = run 开始；`agent_before_settle` / `agent_end` = run 收尾
- **Esc / Observe 的"终止"作用于整个 run**；steer（插话）作用于 run 内的 turn 间
- run 结束（settle）后，等下一条用户输入才开始新 run

### session（会话）

持久化的对话树（JSONL），包含多个 run 的全部消息。`/tree` 导航、`/fork` 分支都在这一层。

### 对照速查

| 概念 | 边界标志 | Observe Mode 的关系 |
|---|---|---|
| tool | 单次调用 | 摘要清单里的一行 |
| 批次 | turn 内的全部调用 | 摘要的观察单元 |
| turn | 一次 API 往返（`turn_end`） | **暂停点挂在这里** |
| run | 输入到 settle | "放行到结束"的"结束"指它 |
| session | 持久化树 | `/tree`、`/fork` 操作层 |
