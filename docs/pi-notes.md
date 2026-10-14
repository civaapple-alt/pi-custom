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
