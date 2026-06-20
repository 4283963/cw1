# 智联车控 EV Connect

新能源汽车车机手机互联系统 Demo，包含远程空调预启和实时车辆寻车两大核心功能。

## 技术栈

**前端**
- React 18 + TypeScript
- Vite 构建工具
- Tailwind CSS 样式框架
- React Router 路由
- React Leaflet 地图组件（OpenStreetMap）
- Axios HTTP 客户端

**后端**
- Go 1.21 + Gin Web 框架
- GORM ORM + MySQL（支持无数据库的内存模式）
- CORS 跨域支持

## 项目结构

```
cw1/
├── backend/                          # Go 后端
│   ├── cmd/
│   │   └── server/
│   │       └── main.go               # 程序入口
│   ├── internal/
│   │   ├── config/
│   │   │   └── config.go             # 配置加载
│   │   ├── database/
│   │   │   └── mysql.go              # 数据库初始化
│   │   ├── handlers/
│   │   │   ├── ac_handler.go         # 空调模块处理器
│   │   │   ├── vehicle_handler.go    # 车辆模块处理器
│   │   │   └── health_handler.go     # 健康检查
│   │   ├── middleware/
│   │   │   └── cors.go               # CORS 中间件
│   │   ├── models/
│   │   │   ├── ac_command.go         # 空调指令模型
│   │   │   └── vehicle_status.go     # 车辆状态模型
│   │   ├── routes/
│   │   │   └── routes.go             # 路由注册
│   │   └── store/
│   │       └── memory_store.go       # 内存存储（无 MySQL 时备用）
│   ├── go.mod
│   ├── go.sum
│   └── .env.example
│
└── frontend/                         # React 前端
    ├── src/
    │   ├── api/
    │   │   ├── client.ts             # Axios 实例
    │   │   ├── ac.ts                 # 空调 API
    │   │   └── vehicle.ts            # 车辆 API
    │   ├── components/
    │   │   └── Layout.tsx            # 布局组件（导航栏）
    │   ├── pages/
    │   │   ├── Home.tsx              # 首页
    │   │   ├── ACControl.tsx         # 远程空调控制页
    │   │   └── VehicleFinder.tsx     # 实时寻车页
    │   ├── types/
    │   │   └── index.ts              # TypeScript 类型定义
    │   ├── App.tsx                   # 根组件
    │   ├── main.tsx                  # 入口
    │   └── index.css                 # 全局样式 + Tailwind
    ├── index.html
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── tsconfig.json
    └── package.json
```

## 快速启动

### 前置要求

- Go 1.21+
- Node.js 18+
- MySQL 8.0+（可选，后端支持无数据库内存模式）

### 1. 启动后端服务

```bash
cd backend

# 1. 下载 Go 依赖
go mod tidy

# 2. 配置环境变量（可选，不配置也能运行）
cp .env.example .env
# 编辑 .env 填写 MySQL 连接信息
# 如果不配置或连接失败，会自动使用内存模式运行

# 3. 启动服务（默认端口 8080）
go run cmd/server/main.go
```

后端启动后访问：`http://localhost:8080/api/v1/health` 确认服务正常。

### 2. 启动前端服务

```bash
cd frontend

# 1. 安装依赖
npm install
# 或使用 pnpm / yarn
pnpm install

# 2. 启动开发服务器（默认端口 5173）
npm run dev
```

前端启动后访问：`http://localhost:5173`

## API 文档

所有 API 统一前缀：`/api/v1`

### 远程空调预启模块

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/ac/start` | 启动空调（创建指令） |
| POST | `/ac/stop` | 停止空调 |
| GET | `/ac/status/:vehicle_id` | 查询最新空调状态 |
| GET | `/ac/history/:vehicle_id?limit=20` | 查询历史指令 |
| GET | `/ac/pending/:vehicle_id` | 查询待执行指令 |
| PUT | `/ac/status` | 更新指令状态（车机端调用） |

**启动空调请求体示例：**
```json
{
  "vehicle_id": "VIN-DEMO-001",
  "user_id": "USER-001",
  "target_temp": 24.0,
  "mode": "auto",
  "fan_speed": 3
}
```

- `target_temp`: 16 ~ 32 (°C)
- `mode`: `auto` / `cool` / `heat` / `vent`
- `fan_speed`: 1 ~ 7

### 车辆实时寻车模块

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/vehicle/report` | 车机端上报状态（GPS+电量） |
| GET | `/vehicle/status/:vehicle_id` | 查询车辆最新状态 |
| GET | `/vehicle/history/:vehicle_id?limit=100` | 查询历史轨迹 |
| POST | `/vehicle/simulate?vehicle_id=xxx&lng=xxx&lat=xxx` | 模拟上报（开发用） |

**上报状态请求体示例：**
```json
{
  "vehicle_id": "VIN-DEMO-001",
  "longitude": 116.3971280,
  "latitude": 39.9075000,
  "battery_level": 78,
  "range_estimate": 390,
  "is_locked": true,
  "is_charging": false
}
```

### 健康检查

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 检查服务健康状态 |

## 功能使用说明

### 远程空调预启

1. 前端打开「远程空调」页面
2. 滑动温度条选择目标温度（16-32°C）
3. 选择运行模式（自动/制冷/制热/通风）
4. 选择风速档位（1-7 档）
5. 点击「🚀 启动空调」发送指令
6. 指令状态会从 `pending` → `running`
7. 可点击「模拟车机端」按钮，模拟车机接收并执行指令
8. 所有操作会记录在下方历史记录表中

### 实时车辆寻车

1. 前端打开「实时寻车」页面
2. 地图上默认显示天安门附近的车辆位置
3. 右侧面板提供三种数据来源：
   - **自动模拟**：每 5 秒随机上报一次位置和电量
   - **单次随机**：点一次上报一次随机数据
   - **手动上报**：精确输入经纬度和电量进行上报
4. 上方卡片实时显示：
   - 剩余电量（带进度条变色）
   - 预估续航里程
   - 距中心点距离（Haversine 公式计算）
   - GPS 更新时间 / 锁车状态 / 充电状态
5. 地图中：
   - 🚗 蓝色圆圈标记 = 车辆当前位置
   - 淡蓝色圆形区域 = 位置周边 100 米范围
   - 虚线 = 历史轨迹连线（可开关）
6. 下方表格记录所有位置上报历史

## 默认车辆 ID

Demo 默认使用：`VIN-DEMO-001`
默认用户 ID：`USER-001`

可在前端页面右上角输入框中修改。

## 数据存储说明

后端采用**双重存储策略**：

1. **MySQL 模式（推荐生产）**：
   - 配置 `.env` 中 MySQL 连接信息
   - 首次启动会自动建表（AutoMigrate）
   - 表：`ac_commands`、`vehicle_statuses`、`vehicle_status_histories`

2. **内存模式（默认/开发）**：
   - 未配置 MySQL 或连接失败时自动启用
   - 数据仅存在内存中，服务重启后丢失
   - 适合 Demo 演示和本地开发

## 常见问题

**Q: 地图不显示？**
A: 页面使用 OpenStreetMap 公共瓦片，需要能访问外网。

**Q: 后端启动报错 MySQL 连接失败？**
A: 正常现象，会自动切换到内存模式运行，不影响功能演示。

**Q: 如何接入真实车机？**
A: 车机端按 API 文档调用 `/vehicle/report` 上报数据，调用 `/ac/pending` 获取待执行空调指令。
