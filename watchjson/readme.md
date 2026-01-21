# Curl And JQ!

��个用于获取 JSON 数据并使用 JQ 进行转换处理的命令行工具。支持 HTTP 请求、链式操作、导入外部配置等功能。

---

## 快速开始

### 安装依赖

需要安装 [Deno](https://deno.land/) 运行时。

### 基本用法

通过 stdin 输入配置，输出处理后的 JSON 数据：

```bash
echo 'pipeline配置' | deno run --allow-net --no-lock --unstable-raw-imports index-deno.mjs
```

### 示例：获取港股价格

```bash
echo '{
  "from": "https://qt.gtimg.cn/q=hk00883",
  "type": "json"
}>>>
.[0] | split("~")
>>>
{
  "title": "中国海洋石油 00883",
  "badge": [
    ["%.2f HKD", (.[3] | tonumber)],
    ["涨跌: %+.2f", ((.[3] | tonumber) - (.[4] | tonumber))],
    ["成交量: %d", (.[6] | tonumber)]
  ],
  "content": {code: "00883", name: .[1], price: (.[3] | tonumber), prevClose: (.[4] | tonumber), change: ((.[3] | tonumber) - (.[4] | tonumber)), volume: (.[6] | tonumber)},
  "refresh": 60
}' | deno run --allow-net --no-lock --unstable-raw-imports index-deno.mjs
```

输出：
```json
{
  "title": "中国海洋石油 00883",
  "content": {
    "code": "00883",
    "name": "中国海洋石油",
    "price": 21.52,
    "prevClose": 21.9,
    "change": -0.38,
    "volume": 65794797
  },
  "refresh": 60,
  "formattedBadges": [
    "21.52 HKD",
    "涨跌: -0.38",
    "成交量: 65794797"
  ]
}
```

---

## 配置格式

详细的配置格式说明请参考 [format.md](./format.md)。

### 基本结构

```json
{
  "from": "https://api.example.com/data",
  "type": "json"
}>>>
{name: .name, value: .value}
```

### 链式操作

使用 `>>>` 分隔符连接多个处理步骤：

```json
{
  "from": "https://api.example.com/data",
  "type": "json"
}>>>
{name: .name, itemCount: (.items | length)}  // 纯 jq 表达式段落
>>>
{
  "title": "处理结果",
  "badge": [["共 %d 项", (.itemCount)]],
  "content": {name: .name, totalItems: .itemCount}
}
```

### 主要字段

| 字段 | 说明 |
|------|------|
| from | 要请求的 URL（推荐） |
| type | 数据类型，如 "json" |
| title | ���面标题 |
| badge | 徽章显示（二维数组） |
| content | 内容数据 |
| refresh | 自动刷新间隔（秒） |

更多字段和用法请查看 [format.md](./format.md)。

---

## 命令行参数

```bash
deno run --allow-net --no-lock --unstable-raw-imports index-deno.mjs [选项]
```

| 参数 | 说明 | 默认值 |
|------|------|--------|
| --timeout | 请求超时时间（如 30s） | 30s |
| -k | 保留原始 badge 数据，不格式化 | - |

---

## 运行时参数说明

| 参数 | 说明 |
|------|------|
| --allow-net | 允许网络访问 |
| --no-lock | 禁用锁文件检查 |
| --unstable-raw-imports | 允许导入 WASM 模块（jq.wasm） |

---

## 从文件读取配置

```bash
cat config.json | deno run --allow-net --no-lock --unstable-raw-imports index-deno.mjs
```

---

## 更多示例

### 简单 GET 请求

```json
{
  "from": "https://api.github.com/users/github",
  "type": "json"
}>>>
{name, login, bio}
```

### GraphQL POST 请求

```json
{
  "from": "https://api.example.com/graphql",
  "type": "json",
  "method": "POST",
  "body": {
    "query": "query { user(id: 1) { name email } }"
  }
}>>>
.data.user
```

### 使用变量替换

```json
{
  "from": "https://api.example.com/data?t=${timestamp}",
  "type": "json"
}
```

---

## 相关文档

- [format.md](./format.md) - 完整的配置格式文档
- [jq 手册](https://stedolan.github.io/jq/manual/) - JQ 表达式语法参考
