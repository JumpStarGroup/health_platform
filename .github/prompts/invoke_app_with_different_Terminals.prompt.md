---
agent: agent
---
请严格按照如下的顺序，分别打开不同的终端，启动本应用，严格遵守以下步骤以确保环境隔离：要求命令行在各自独立的终端中执行，避免在同一终端中混合运行多个服务或命令。命令行按照操作系统使用相应的命令提示符（如 Windows 使用 `cmd.exe`，Linux/Mac 使用 `bash` 或 `zsh`）。以下示例以 Windows `cmd.exe` 为例：

1. **启动后端（Terminal 1，仅用于后端）**：
   - 创建一个**新的**终端窗口（Terminal 1，专门用于后端）。
   - 执行以下命令（Windows `cmd.exe`）：

     ```cmd
     cd /d c:\Zhuang\Source\health_platform
     python -m venv .venv
     .\.venv\Scripts\activate.bat
     set PYTHONPATH=.
     python -m flask --app src.app run --host=0.0.0.0 --port=5000
     ```

   - 启动成功后，**保持该终端运行，不要在此终端执行任何其他命令**（包括测试、脚本等）。

2. **启动前端（Terminal 2，仅用于前端）**：
   - 创建另一个**新的**终端窗口（Terminal 2，专门用于前端）。
   - 执行以下命令（Windows `cmd.exe`）：

     ```cmd
     cd /d c:\Zhuang\Source\health_platform\frontend
     npm install
     npm start
     ```

   - 启动成功后，**保持该终端运行，不要在此终端执行任何其他命令**。任何试图在该终端追加命令（例如通过 `&&` 串联）都被视为错误用法。

3. **准备操作终端（Terminal 3，仅用于交互命令）**：
   - 创建第三个**新的**终端窗口（Terminal 3，专门用于后续所有交互式命令）。
   - 执行以下命令（Windows `cmd.exe`）：

     ```cmd
     cd /d c:\Zhuang\Source\health_platform\tests\e2e
     echo Operational Terminal Ready,will do e2e regression tests here.
      npx playwright install --with-deps

     npx playwright test tests/regression-user-journey-cn.spec.js --headed --reporter=html,list
     ```

   - 自此以后：
     - **所有测试、脚本、一次性命令（如 `python -m pytest -q`）只允许在 Terminal 3 执行**；
     - Terminal 1 只负责后端，Terminal 2 只负责前端，严禁在这两个终端执行其他命令，以避免出现 "终止批处理操作吗 (Y/N)?" 导致服务被意外停止的问题。
