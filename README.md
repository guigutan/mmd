# mmd


## Cloudflare Pages 部署

本项目需要构建后才能发布。Pages 控制台的构建设置必须填写：

| 配置 | 值 |
| --- | --- |
| 框架预设 | None |
| 构建命令 | npm run build |
| 构建输出目录 | dist |
| 根目录 | 留空（仓库根目录） |
| 环境变量 | NODE_VERSION=22 |

保存后重新部署。如果日志出现 No build command specified，说明构建命令仍未生效。dist 是构建产物，无需提交到 Git。

Workers 配置独立保存在 wrangler.workers.jsonc，Pages 无需使用该文件。Workers 部署使用 npm run deploy:workers。
