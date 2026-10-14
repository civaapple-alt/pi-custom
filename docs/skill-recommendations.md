# Skill 推荐清单（skills.sh & skillhub.cn）

> 整理时间：基于 skills.sh 目录 + skillhub.cn API（1.2 万插件星标排序）。

## skills.sh（均为 SKILL.md 格式，pi 可直接使用）

| # | Skill | 说明 |
|---|---|---|
| 1 | `anthropics/skills/frontend-design` | Anthropic 官方：做有辨识度的 UI 设计（美学方向、排版、视觉层次） |
| 2 | `anthropics/skills/skill-creator` | 官方元 skill：创建 / 改进 / 评估 skill |
| 3 | `anthropics/skills/pptx` | 官方：读写 .pptx，生成/修改幻灯片 |
| 4 | `mattpocock/skills/tdd` | TDD 工作流（red-green-refactor） |
| 5 | `mattpocock/skills/diagnosing-bugs` | 硬 bug / 性能回退的诊断闭环 |
| 6 | `mattpocock/skills/handoff` | 把当前对话压缩成交接文档给下一个 agent（补 pi 无 handoff 的缺） |
| 7 | `mattpocock/skills/code-review` | 按仓库自身规范审查自某 commit 以来的改动 |
| 8 | `mattpocock/skills/codebase-design` | "深模块"设计：设计接口、找加深机会、删浅模块 |
| 9 | `mattpocock/skills/to-spec` | 把当前对话沉淀成 spec 并发到 issue tracker |
| 10 | `vercel-labs/skills/find-skills` | 发现 / 安装 skill 的元 skill |

> Matt Pocock 系列（tdd / diagnosing-bugs / code-review / codebase-design / to-spec / handoff）是一套完整工程方法论，可整套引入。

## skillhub.cn

⚠️ 该站主要服务 DSH（DeepSeek Harness）：**skill 类**为通用 SKILL.md 格式，pi 可直接复用；**插件类**多数 DSH 专用，需适配或仅参考思路。

| # | 项目 | 类型 | 说明 | 星标 |
|---|---|---|---|---|
| 1 | `kenryu42/cc-safety-net` | skill | AI 执行前守卫：拦截破坏性命令 | ★1620 |
| 2 | `qingyuna/answer-me-with-html` | skill | 难的问题用 HTML 页面作答（自带交互图表） | ★3326 |
| 3 | `superdesigndev/superdesign-skill` | skill | 给 coding agent 用的设计 skill | ★676 |
| 4 | `miaotofu01/study-mate` | skill | AI 学习搭档：定路线、讲知识、带做项目 | ★939 |
| 5 | `ericshang98/perfect-web-clone` | skill | 贴 URL 像素级克隆网页，可测量对比 | ★271 |
| 6 | `vshulcz/deja-vu` | 插件 | 跨 38+ 种 coding agent 的持久记忆 | ★1194 |
| 7 | `ganyuanran/aegis` | 插件 | 让 agent 架构感知：baseline 先行、渐进评估 | ★1346 |
| 8 | `adoresever/graph-memory` | 插件 | 知识图谱记忆（清华研讨会发布） | ★648 |
| 9 | `liustack/modsearch` | 插件 | 号称 DSH 最强免费联网搜索 | ★677 |
| 10 | `nanmicoder/dsh-agent-teams` | 插件 | 多 agent 团队协作（DSH 专用，借鉴思路） | ★2124 |

## 优先组合（pi + kimi 订阅场景）

1. `mattpocock/skills/handoff` — 补上 pi 缺的交接能力
2. `anthropics/skills/frontend-design` — 与现有 Web 调试 skill 配套
3. `kenryu42/cc-safety-net` — 给 agent 操作加保险
