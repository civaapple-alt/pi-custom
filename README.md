# pi-custom

pi coding agent 的个人知识库：使用笔记、速查表、精选清单与功能提案。

相关的可运行扩展代码在姊妹仓库 [pi-extensions](https://github.com/civaapple-alt/pi-extensions)。

## 文档索引

| 文档 | 内容 |
|---|---|
| [docs/pi-notes.md](docs/pi-notes.md) | pi 使用笔记：状态栏、session、tree/fork/clone、/share 机制、联网方案、/reload、概念辨析（session/run/turn/tool） |
| [docs/slash-and-shortcuts.md](docs/slash-and-shortcuts.md) | 常用 slash 命令与快捷键速查表（含 Windows 差异标注） |
| [docs/suggest-plugin.md](docs/suggest-plugin.md) | pi.dev 插件推荐 |
| [docs/skill-recommendations.md](docs/skill-recommendations.md) | skills.sh / skillhub.cn 精选 skill |
| [docs/pstack.md](docs/pstack.md) | pstack 技能包的选择、安装与使用 |
| [docs/proposals/observe-mode.md](docs/proposals/observe-mode.md) | **Observe Mode 提案**：agent 执行过程的观察模式（含开发历程实录） |

## 提案目录

`docs/proposals/` 放功能提案：问题 → 设计判断 → 可行性验证 → 里程碑。Observe Mode 是首个完整样本（M1 报幕 ✅ / M2 验证 ✅ / M3 实现 ⏳）。

## 源码研读

`durable/docs/` 放 pi 官方仓库源码的研读笔记（不动官方克隆，`D:\gh-ws\pi` 仅作只读参考）。当前：

- [durable/docs/pi-durable-notes.md](durable/docs/pi-durable-notes.md) — Pi Durable（`packages/durable`）架构解读

## 约定

- 本仓库只放 markdown，代码归 [pi-extensions](https://github.com/civaapple-alt/pi-extensions)
- 文档中的本机路径一律用占位符（如 `C:\Users\<用户>\`），不出现真实路径
