## 语言

- 所有思考过程和输出结果都必须使用中文，除非用户特别说明使用其他语言。

## 网站开发固定前置要求

- 本项目是网站项目。每次进行网站、网页、前端、UI、动效、落地页、可视化页面、Web app、HTML/CSS/React/Vue/Next/Vite/Tailwind 等相关工作前，必须先主动复习并调用这些 skills：
  - `impeccable`：设计判断、页面质感、布局、字体、颜色、交互、审美检查与 polish。
  - `taste-skill` 以及同仓库相关 taste/design skills：视觉品味、风格方向、设计批判和界面质量提升。
  - `gsap-skills` 相关 skills：至少根据任务读取 `gsap-core`；涉及时间轴读取 `gsap-timeline`；涉及滚动读取 `gsap-scrolltrigger`；涉及 React 读取 `gsap-react`；涉及性能读取 `gsap-performance`。
- 开始写前端代码前，必须简短说明会使用这些 skills，并读取相关 `SKILL.md` 或必要引用文件；不要只凭记忆使用。
- 如果当前会话刚安装 skill 但还没有重启 Codex，导致 skill 未出现在可用 skills 列表中，则直接从本地路径读取：
  - `/Users/taoooooer/.codex/skills/impeccable/SKILL.md`
  - `/Users/taoooooer/.codex/skills/taste-skill/SKILL.md`
  - `/Users/taoooooer/.codex/skills/gsap-core/SKILL.md`
  - 以及任务需要的其他 `/Users/taoooooer/.codex/skills/gsap-*/SKILL.md`
- 如果任务不是网站或前端相关，可以跳过这些 skills。

## 复杂任务的自动子代理要求

- 每次遇到复杂任务、多步骤任务、跨文件修改、全栈/前端页面开发、原因不明的 bug、测试/CI/性能/可访问性排查、重构、需要多方案比较或需要独立验证的任务时，必须先主动调用并复习 `auto-parallel-agents`。
- 复杂任务可以主动分派子代理并行工作，最多 6 个；不要为了凑数启动子代理。
- 子代理固定按启动顺序命名为：马化腾、马云、刘强东、雷军、任正非、丁磊；如果子代理工具支持可写 UI 显示名，必须让右侧子代理 UI 显示这些名字。若当前工具不支持改 UI 昵称，则在计划、提示词和汇报里使用这些代号兜底。
- 子代理应拆成互相独立的工作面，例如代码库侦察、方案设计、局部实现、测试验证、前端审美/响应式检查、集成风险复核。
- 主代理必须保留最终责任：继续推进本地关键路径，整合子代理结果，解决冲突，运行验证，并向用户汇报结论。
