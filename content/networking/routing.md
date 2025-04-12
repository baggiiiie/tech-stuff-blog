## how does src/dst addr change between hops


## 流程
destination 在同一个物理子网(可路由的网络)里
- source host 准备好 ip packet 之后, 查看自己的 路由表
- 如果 路由表 里, 对应的 destination ip 所处于的子网有 gateway, 那就走 gateway
- 如果 路由表 里, 对应的 destination ip 所处于的子网没有 gateway, 那说明在同一个子网, 可以直接发给 destination host, 不需要 gateway

## routing table
[Computer Networking Tutorial - 39 - Routing Tables Explained](https://www.youtube.com/watch?v=g8eP4fhrx3I)
- routing within the same subnet does NOT require a gateway.
[Example:](https://en.wikipedia.org/wiki/Route_(command)#Example)

| **Destination** | **Gateway**     | **Genmask**   | **Flags** | **Iface** |
| --------------- | --------------- | ------------- | --------- | --------- |
| 192.168.101.0   | 192.168.102.102 | 255.255.255.0 | UG        | eth0      |
| 192.168.102.0   | 0.0.0.0         | 255.255.255.0 | U         | eth0      |
| 192.168.103.0   | 192.168.102.102 | 255.255.255.0 | UG        | eth0      |
| 192.168.12.0    | 0.0.0.0         | 255.255.255.0 | U         | eth0      |
| 0.0.0.0         | 192.168.12.1    | 0.0.0.0       | UG        | eth0      |

Explanation:
- destination 里的 0.0.0.0 表示 *任意流量*, 也就是 除了 routing rules 里声明的其他 ip
- gateway 里的 0.0.0.0 表示 *不需要 gateway*, destination 是 *直连网络 (在同一子网)*

IRL:
![[Pasted image 20250405085710.png|700]]



## 图解
![[routing.excalidraw.svg|700]]
- 假设是个 https 的请求, 默认端口是 443
- device B 那边是个 https server, 在监听 443 这个 port, 所以 dst port 一直是 443


Claude:
> 如果 subnet 1 和 subnet 2 都使用可路由的 IP 地址，并且路由器只是转发而不做 NAT，那么源 IP 和目标 IP 确实不会改变。