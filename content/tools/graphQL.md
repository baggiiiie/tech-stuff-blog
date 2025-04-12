# graphQL 是啥
一个 query language, 特点是: 
- **允许客户端精准地请求所需要的数据**
- 单个端口: REST API 可能有多个不同的端点, GraphQL 只有一个通用端点, 所有查询都通过这个端点完成

某种程度上, graphQL 和 rest、rpc 一样, 都是在定义 http 的使用方式, 但是 graphQL 算是一种比较新颖的数据查询的方式, 一种比较新颖的 api 的设计理念:
- GraphQL 的查询结构允许精确请求和灵活组合数据
- REST 侧重于资源管理
- RPC 侧重于调用远程方法

## 啥叫 精准地请求?
- 如果是 rest api, 那么通常都是 `GET /users/1` 这样个请求, 服务端返回 user1 的所有数据
- 对于 graphQL, 请求是这样的:
```graphql
query {
  user(id: "1") {  // 获取 user1 的信息
    id
    name
    posts {
      id
      title
    }
  }
}
```
- 然后服务端只返回客户端请求的数据结构, 解决了 *过度请求 over-fetching* 和 *under-fetching* 的问题
	- 精准地请求了数据, 没有 over-fetching, 那传输的效率就高起来了

