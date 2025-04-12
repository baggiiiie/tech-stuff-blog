# API gateway
一个架构里所有 API 请求的入口, 把请求转发给对应的 server
nginx、kong 是常见的 api gateway
主要功能:
- tls 卸载
	- 在 api gateway 这一层作 TLS 相关的校验, 后端服务器只需要处理 HTTP 的逻辑就行
- 身份验证、安全
	- 在 api gateway 这一层加防火墙
	- 也可以对单个 API 进行鉴权
- 数据收集
	- 所有流量都会经过 api gateway, 可以在这一层进行数据采集
- 协议转换
	- 可以把外部进来的 http/1.1 转成 http2、3, 再发给后端服务器
- 在数据转发的时候进行一些压缩一类的操作

