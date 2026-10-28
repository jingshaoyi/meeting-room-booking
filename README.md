# 会议室预约小程序

基于 Taro、React、TypeScript 和微信云开发的会议室预约系统，包含用户预约端与小程序内管理端，无需单独部署 Web 后台。

## 功能

### 用户端
- 浏览会议室、容量、设施与审批要求
- 按日期和连续时段预约会议室
- 自动检查容量、过期时段和预约冲突
- 查看预约状态、驳回原因并取消预约

### 管理端
- 管理工作台：待审批、今日会议和启用会议室统计
- 会议室管理：搜索、新增、编辑、启停和安全删除
- 预约管理：多条件筛选、通过、驳回、取消和详情查看
- 用户权限：设置或取消管理员，保护当前账号和最后一名管理员
- 云端强制管理员权限校验，普通用户不显示管理入口

## 技术栈

- Taro 4.1.9
- React 18 + TypeScript + Sass
- 微信小程序 + 微信云开发
- Node.js 内置测试运行器

## 项目结构

```text
├── src/
│   ├── pages/              # 用户预约页面
│   │   └── admin/          # 管理端独立分包
│   └── utils/              # 云函数调用与数据类型
├── cloudfunctions/         # 用户与管理云函数
│   └── database.schema.json
├── cloud-tests/            # 云端业务逻辑测试
├── config/                 # Taro 构建配置
└── project.config.json     # 微信开发者工具项目配置
```

## 本地运行

### 环境要求

- Node.js 20 或更高版本
- 微信开发者工具
- 已开通的微信云开发环境

### 安装与构建

```bash
npm install
npm run dev:weapp
```

使用微信开发者工具导入项目根目录，编译产物位于 `dist/`。

### 配置云开发

1. 将 `project.config.json` 中的 `appid` 替换为自己的小程序 AppID。
2. 将 `src/utils/cloud.ts` 中的 `CLOUD_ENV` 替换为自己的云开发环境 ID。
3. 在微信开发者工具中部署 `cloudfunctions/` 下的全部云函数，选择“上传并部署：云端安装依赖”。
4. 按 `cloudfunctions/database.schema.json` 创建 `rooms`、`bookings`、`users` 集合及索引。

### 设置首个管理员

首次登录后，在云开发控制台的 `users` 集合中找到自己的用户记录，将 `role` 修改为 `admin`。重新进入“我的预约”即可看到管理入口。

## 常用命令

```bash
# 微信小程序开发构建
npm run dev:weapp

# 微信小程序生产构建
npm run build:weapp

# 云端业务逻辑测试
npm run test:cloud

# TypeScript 项目检查
npx tsc --noEmit --skipLibCheck
```

## 安全说明

请勿提交 `.miniapp/` 中的上传私钥、个人开发者配置或任何账号凭证。这些本地文件已加入 `.gitignore`。

## 开源协议

本项目基于 [MIT License](./LICENSE) 开源。
