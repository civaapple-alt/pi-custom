# pstack 技能包：选择、安装与使用

> pstack 是 Lauren Tan（@poteto，React Core Team / 前 Meta、Netflix、Cursor）发布的工程方法论技能包，目标是"写更少的代码，但质量更高"。
> 本文记录 pi 环境下的选型与用法（已在本机安装验证）。

## 1. 它是什么

Cursor 官方插件仓库 [`cursor/plugins/pstack`](https://github.com/cursor/plugins/tree/main/pstack) 的内容构成：

```
pstack/
├── plugin.json      # Cursor 插件清单（pi 不支持此格式）
├── skills/          # 53 个 SKILL.md 技能 ⭐ pi 可直接使用
├── agents/          # Cursor 后台 agent 定义（不可移植）
└── automations/     # Cursor 自动化（不可移植）
```

pi 不认 agent-plugins.org 的 plugin.json 规范；但 skills 是标准 Agent Skills 格式，pi 原生支持。
不可移植部分：`agents/`、`automations/`，以及" grok 写代码 / opus 做评审"的多模型分工（Cursor 专属概念，pi 下由当前模型一把抓）。

## 2. 选型（GitHub 现状）

| 仓库 | 星标 | 说明 |
|---|---|---|
| **`backnotprop/pstack`** | ★1800 | 官方独立镜像，README 明确支持 Pi，与 Cursor 上游同步。**已选此仓库** |
| `michael-denyer/pstack-claude` | ★1967 | 多 agent 移植版（含 Pi） |
| `shrimpwtf/oh-my-pstack` | ★32 | 可移植工作流（Pi/OMP/Codex） |
| `kkgogogo17/pi-pstack` | ★8 | Pi 原生移植，带 sticky Poteto Mode + 隔离子代理 |

pi.dev 与 skills.sh 官方目录当时均未收录。

## 3. 安装（已完成）

pi 扫描共享 Agent Skills 目录 `~/.agents/skills/`（各 agent 通用，Claude Code / Codex 也能用同一套）：

```bash
git clone --depth 1 https://github.com/backnotprop/pstack.git
cp -r pstack/skills/* ~/.agents/skills/
rm -rf pstack
```

安装结果：53 个 skill 全部就位，逐一校验 SKILL.md 存在，与原有 8 个 skill 无重名冲突。
pi 中执行 `/reload` 后生效。

## 4. 使用

### 触发机制（重要）

上游 53 个 skill 中 **52 个带 `disable-model-invocation: true`**（唯一例外 `setup-pstack`）：
- 不会自动触发，只能**显式调用** `/skill:<name>`
- 由 `/skill:poteto-mode` 的 playbook 调度时不受影响（playbook 直接指示读取磁盘上的 SKILL.md 文件）

这是 pstack 的编排哲学：不靠模型自动路由，靠 poteto-mode 统一调度，避免 50+ skill 干扰模型选择。

### 入门两步

1. `/skill:setup-pstack` —— 选推理预算、配置模型分工偏好
2. 任务开头用 `/skill:poteto-mode <任务描述>` —— 主入口，23 个 playbook（investigation / bug-fix / perf / hillclimb / ...）自动选路

### 常用单点技能（显式调用）

| 场景 | 命令 |
|---|---|
| 测试驱动修 bug | `/skill:tdd` |
| 清理啰嗦表达 | `/skill:unslop` |
| 注释纪律 | `/skill:no-comments` |
| 技术写作标准（Diátaxis + Google style） | `/skill:technical-writing` |
| 架构设计（深模块） | `/skill:architect` |
| 代码评审 | `/skill:correct` |
| 根因追问 | `/skill:why` |
| 28 个工程原则 | `/skill:principle-<名称>` |

完整清单见 `~/.agents/skills/` 目录。

### 想改自动触发？

改对应 SKILL.md frontmatter 一行即可：

```bash
sed -i 's/^disable-model-invocation: true/disable-model-invocation: false/' ~/.agents/skills/<名字>/SKILL.md
```

注意：当前本机保持上游默认（全部显式调用），未做改动。

## 5. 注意事项

- 多模型评审分工在 pi 里不会自动映射，流程仍可用，只是单模型执行
- 个别 skill 可能引用 Cursor 特有命令，遇到再微调（纯 markdown，好改）
- 升级方式：重新 clone 覆盖 `~/.agents/skills/` 中对应目录
