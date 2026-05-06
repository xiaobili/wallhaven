# Phase 5: 架构优化（服务层与状态管理）- Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-06
**Phase:** 05-architecture-service-state
**Areas discussed:** Service 层职责边界, 缓存迁移策略, Service 与 Store 职责, 收藏状态缓存位置, 迁移顺序, 兼容性处理

---

## Service 层职责边界

| Option | Description | Selected |
|--------|-------------|----------|
| 修复：创建 Repository 层 | 创建 download.repository.ts，将 electronClient 调用移至 Repository。符合分层架构，但需新增文件 | ✓ |
| 接受：文档标注为例外 | 在现有文档中标注 download.service 为例外，保持现状。改动最小，但架构不一致 | |
| 调整规则：允许 Service 直接调用 Client | 将 electronClient 直接调用标记为"允许直接访问底层的 Service"。改变架构规则 | |

**User's choice:** 修复：创建 Repository 层
**Notes:** 用户选择推荐选项，符合架构规范

---

## 缓存迁移策略

| Option | Description | Selected |
|--------|-------------|----------|
| 迁移到 Store，保留 LRU/TTL | 将 Service 的 LRU/TTL 逻辑移到 Store，Store 使用 LRUCache 实例。保持缓存特性，但 Store 变重 | ✓ |
| 简化：Store 只用 Map | 删除 Service 缓存，Store 只用简单 Map。放弃 LRU/TTL 优化，但实现简单 | |
| 分离：Service 缓存请求级 | Service 缓存改为"请求级"缓存（单次有效），Store 持久状态。双重职责，但分离关注点 | |

**User's choice:** 迁移到 Store，保留 LRU/TTL
**Notes:** 用户选择推荐选项，保持缓存优化特性

---

## Service 与 Store 职责

| Option | Description | Selected |
|--------|-------------|----------|
| 无状态服务层 | Service 只做错误转换、数据转换、业务规则。不持有状态。符合"无状态服务"模式 | ✓ |
| Service 作为可选层 | Service 保留 Repository 调用封装，Store 可选调用 Service 或直接 Repository。灵活但不统一 | |
| 完全移除 Service 层 | 删除 Service 层，Composable 直接调用 Repository + Store。减少层级，但 Composable 变复杂 | |

**User's choice:** 无状态服务层
**Notes:** 用户选择推荐选项，Service 层转为纯业务逻辑层

---

## 收藏状态缓存位置

| Option | Description | Selected |
|--------|-------------|----------|
| 迁移到 FavoritesStore | 作为 useFavoritesStore 的属性。逻辑上收藏状态属于收藏功能，易于维护 | ✓ |
| 迁移到 WallpaperStore | 作为 useWallpaperStore 的属性。收藏状态注入壁纸数据时使用， WallpaperStore 更方便访问 | |
| 创建专门的 FavoriteStatusStore | 创建独立的 useFavoriteStatusStore。最小化修改范围，但增加一个 Store | |

**User's choice:** 迁移到 FavoritesStore
**Notes:** 用户选择推荐选项，收藏状态与收藏功能绑定更合理

---

## 迁移顺序

| Option | Description | Selected |
|--------|-------------|----------|
| 先缓存后职责 | 先迁移缓存，再修复 Service 职责。状态位置先到位，再调整职责边界 | ✓ |
| 先职责后缓存 | 先修复 Service 职责，再迁移缓存。先解决架构债务，再移动状态 | |
| 按 Service 逐个迁移 | 每个 Service 独立完成职责+缓存迁移。按功能域分解，更容易测试 | |

**User's choice:** 先缓存后职责
**Notes:** 用户选择推荐选项，状态迁移优先

---

## 兼容性处理

| Option | Description | Selected |
|--------|-------------|----------|
| 直接删除旧代码 | 迁移后删除 Service 缓存代码。干净利落，但无法回滚 | ✓ |
| 注释保留旧代码 | 保留 Service 缓存代码但注释掉。可回滚，但留下死代码 | |
| 双写过渡期 | 迁移期间保留 Service 缓存，两者并存一段时间。更安全，但状态同步复杂 | |

**User's choice:** 直接删除旧代码
**Notes:** 用户选择推荐选项，代码干净无死代码

---

## Claude's Discretion

- 各 Service 的具体缓存迁移实现细节
- LRUCache 在 Store 中的封装方式
- 无状态 Service 的具体方法签名调整

## Deferred Ideas

None — 讨论保持在阶段范围内
