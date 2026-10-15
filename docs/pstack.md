# pstack 技能包：选择、安装与使用

> pstack 是 Lauren Tan（@poteto，React Core Team / 前 Meta、Netflix、Cursor）发布的工程方法论技能包，目标是"写更少的代码，但质量更高"。
> 本文记录 pi 环境下的选型与用法（已在本机安装验证）。

## 1. 选型

Cursor 官方插件 [`cursor/plugins/pstack`](https://github.com/cursor/plugins/tree/main/pstack) 有 53 个 skill，但 52 个带 `disable-model-invocation: true`（纯显式调用），且包含 Cursor 专属部分（`agents/`、`automations/`、多模型分工）。

最终选择：**[`FetchUpstream/pstack-plugin`](https://github.com/FetchUpstream/pstack-plugin)**（ChatGPT Web 非官方精选版），理由：

- 从上游 53 个精选 **26 个**适合纯对话场景的 skill（去掉了依赖 Cursor agent / 本地工具 / 代码执行的）
- 保留上游可独立工作的部分（unslop、bro、technical-writing、typescript-best-practices、principle-* 等）
- 可自定义自动触发（见下）

备选：`backnotprop/pstack`（★1800，官方独立镜像，53 个全量）、`michael-denyer/pstack-claude`（★1967）。

## 2. 安装（已完成）

pi 的专用 skill 目录（不与其他 agent 共享）：

- 用户级：`~/.pi/agent/skills/`
- 项目级：`<项目>/.pi/skills/`
- （共享的 Agent Skills 位置 `~/.agents/skills/` 本机只保留原有 8 个非 pstack skill）

```bash
git clone --depth 1 https://github.com/FetchUpstream/pstack-plugin.git
cp -r pstack-plugin/skills/* ~/.pi/agent/skills/
```

已开启自动触发：26 个 skill 的 `disable-model-invocation` 全部为 `false`
（8 个原本无此标记天然自动触发，18 个由 `true` 改为 `false`）。

pi 中 `/reload` 后生效。

## 3. 使用

- **自动触发**：描述匹配场景时模型自行加载（如写文档触发 technical-writing、改 TS 触发 typescript-best-practices）
- **显式调用**：`/skill:unslop`、`/skill:architect`、`/skill:principle-<名>` 等
- 全部 26 个：architect、blast-radius、bro、how、unslop、technical-writing、typescript-best-practices、principle-*（约 18 个）等，见 `~/.pi/agent/skills/`

注意：此精选版**不含** `poteto-mode` / `setup-pstack` / `tdd` / `swarm` 等编排类 skill——它们依赖 Cursor 的 agent 机制，被作者有意排除。若需要 poteto-mode 工作流，可再装 `backnotprop/pstack` 补入（会回到显式调用模式）。

## 4. 管理

```bash
# 查看
ls ~/.pi/agent/skills/

# 关闭某个 skill 的自动触发
sed -i 's/^disable-model-invocation: false/true/' ~/.pi/agent/skills/<名>/SKILL.md

# 升级：重新 clone 覆盖
```
