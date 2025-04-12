# Network Address Translation
[[network stack#Network Address Translation NAT]]
概括:
- 一个 data packet 进出 LAN 的时候, router 会把这个 packet 上的 **内网里某一设备的 ip:port** 转换成 **router 自己在公网上的 ip:port**
- router 会维护一个 NAT table 来记录这些转换
-》 本身 NAT 这个名字里的 Address Translation 就说明了, NAT device 不是简单的 forward 一个 data packet, 是有 reconstruction 的

> [!note]
> NAT 设备一般也有 firewall, 不允许外部设备主动和内部设备建立连接 (blocking inbound connections);  
> ssh 这种一般都是 handpicked exception.  
    

正面影响:
- 解决了 IPv4 地址干涸的问题 
- 隐藏内网里设备的地址, 保护设备, 提高安全性 
负面影响:
- 影响 端到端连接 (end to end / peer to peer)
	- NAT 导致内网的设备没有 公网 ip, 外部设备不能主动发起链接 
- 增加了延迟

# NAT Traversal
[tailscale explanation, really a great read, being informative while interesting](https://tailscale.com/blog/how-nat-traversal-works)
- when there's a firewall in place, packets flow uni-directionally in terms of connection initiation. only outbounding packets are allowed, meaning the connection can only be initiated from inside the LAN
- but after the connection has been established, packets are just flying bidirectional: client requesting and server sending response
- (simplified, for UDP) as long as a NAT device has seen an outbounding packet from `1.1.1.1:1234 (inside LAN)` to `7.7.7.7:5678 (outside LAN)`, it allows a packet from `7.7.7.7:5678` to `1.1.1.1:1234`
 > [!note]
 > i remember reading somewhere that firewalls reject inbouding `SYN` packets, hence for TCP NAT traversal isn't like this

- hence, if a device A can sends a *random* UDP packet to the void to **a specific ip:port**, and another device B sends a packet to device A with that ip:port as source ip:port, device A's firewall would NOT reject the packet
- 然而, 对于 NAT, 还有一个 caveat 是: 要 outbound traffic 经过 NAT device 走出 LAN 的时候, 才会形成这个 NAT table
- end to end 的 context 下, 在 sender 发出去 outbound message 之前, receiver 那边的都还没有形成对应的 NAT table, sender 都还不知道 destination 的 ip:port 是什么
	- -> "NAT mappings only get created when outbound traffic towards the internet requires it"
- 那么也就是说, 要开始发 packet 之前, 要有 some sort of communication
	- -> "to communicate, first you need to be able to communicate"
	- -> "both side have to speak first, but neither side knows to whom to speak, and can't know until the other side speaks first"

## STUN
- 作为 client, 只有自己在发送 outbound traffic 的时候, NAT device 才会生成一个 `inner ip:port -> outer ip:port` 的 mapping
- 那么 client 只需要发送一条信息, 就会在 NAT table 里生成一个 record
- 接受这条消息的 server 是能够看到这个 `outer ip:port` 的
- 如果这个 server 能够再告诉 client 这个 `outer ip:port` 的话, 那 client 就知道自己在外网上看起来是怎么样的了; 这个时候 client 就可以告诉其他 peers 自己在公网上的 ip:port 了
> That’s fundamentally all that the STUN protocol is: your machine sends a “what’s my endpoint from your point of view?” request to a STUN server, and the server replies with “here’s the `ip:port` that I saw your UDP packet coming from.”
![[Pasted image 20250311220537.png|500]]
- 注意, 每个 socket 都要这样的一套流程, client 才知道这个 socket 的公网 ip:port; 因为 socket 的四元素里就是 ip:port
	- 换句话说, 一台 client 上要多个 NAT traversal 的话, 就需要多个这样的 socket

- 简单的防火墙会根据 `source inner_ip:port` 分配 `source outer_ip:port`
- 复杂的防火墙会根据 source 和 dest 的 ip:port 分配 `source outer_ip:port`, 这也就意味着, 即便是同一个 socket, 从 STUN server 获得的自己的 outer_ip:port 也不能用于和其他 destination 交流
