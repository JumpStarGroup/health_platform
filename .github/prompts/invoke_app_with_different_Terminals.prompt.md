---
agent: agent
---

请严格按照如下顺序，分别在不同终端窗口启动本应用，确保环境隔离：

1. Windows 下请使用 `cmd.exe`，Linux/Mac 下请使用 `bash`。如默认终端不是 cmd 或 bash，请先输入 `cmd` 或 `bash` 切换。
2. 启动后请检查当前目录，确保在 `health_platform` 项目根目录（可用 `cd` 和 `pwd`/`dir` 检查）。如不在根目录，请用 `cd ..` 或 `cd health_platform` 切换。
3. 后续所有命令均采用相对路径，不使用绝对路径，以兼容不同系统。

以下分别给出 Windows（cmd）和 Linux/Mac（bash）示例：

---

1. **启动后端（Terminal 1，仅用于后端）**：
   - 新建终端窗口（Terminal 1，仅用于后端）。
   - 切换到项目根目录（如不在根目录，使用 `cd ..` 或 `cd health_platform`）。
   - Windows（cmd）：
     ```cmd
     python -m venv .venv
     .\.venv\Scripts\activate.bat
     set PYTHONPATH=.
     python -m flask --app src.app run --host=0.0.0.0 --port=5000
     ```
   - Linux/Mac（bash）：
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     export PYTHONPATH=.
     python3 -m flask --app src.app run --host=0.0.0.0 --port=5000
     ```
   - 启动成功后，**保持该终端运行，不要在此终端执行其他命令**（包括测试、脚本等）。
   - **注意**：如果后端服务启动失败，请检查 `src/app.py` 文件中的 `app` 对象是否正确初始化，以及 `app.config.from_object` 是否正确配置。

---

2. **启动前端（Terminal 2，仅用于前端）**：
   - 新建另一个终端窗口（Terminal 2，仅用于前端）。
   - 切换到 `frontend` 目录（如不在根目录，使用 `cd health_platform； 然后再cd frontend`）。
   - Windows（cmd）：
     ```cmd
     npm install
     npm start
     ```
   - Linux/Mac（bash）：
     ```bash
     npm install
     npm start
     ```
   - 启动成功后，**保持该终端运行，不要在此终端执行其他命令**。任何试图在该终端追加命令（如 `&&` 串联）都视为错误。

---

3. **准备操作终端（Terminal 3，仅用于交互命令）**：
   - 新建第三个终端窗口（Terminal 3，仅用于后续所有交互式命令）。
   - 切换到 `tests/e2e` 目录（如不在根目录，使用 `cd tests\e2e` 或 `cd tests/e2e`）。
   - Windows（cmd）：
     ```cmd
     echo Operational Terminal Ready,will do e2e regression tests here.
     npx playwright install --with-deps
     npx playwright test tests/regression-user-journey-cn.spec.js --headed --reporter=html,list
     ```
   - Linux/Mac（bash）：
     ```bash
     echo "Operational Terminal Ready,will do e2e regression tests here."
     npx playwright install --with-deps
     npx playwright test tests/regression-user-journey-cn.spec.js --headed --reporter=html,list
     ```
   - 自此以后：
     - **所有测试、脚本、一次性命令（如 `python -m pytest -q`）只允许在 Terminal 3 执行**；
     - Terminal 1 只负责后端，Terminal 2 只负责前端，严禁在这两个终端执行其他命令，以避免出现 "终止批处理操作吗 (Y/N)?" 导致服务被意外停止的问题。
