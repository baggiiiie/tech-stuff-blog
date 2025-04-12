在浏览器里输入 url 之后发生了什么
[小林](https://xiaolincoding.com/network/1_base/what_happen_url.html#%E4%B8%A4%E7%82%B9%E4%BC%A0%E8%BE%93-mac)
大概流程:
1. 浏览器解析 url
2. 浏览器检查缓存, 看是否有这个 url 对应的资源
3. dns, 根据域名找 ip
4. 有 ip 了, 数据包就要出子网了
5. 要出子网要先通过 ARP 找 路由器 的 MAC address
6. 数据包发到路由器, 从路由器走出子网, 通过 BGP 在路由器中跳转
7. 到达目标子网之后, 再通过 ARP 找到目标主机
8. 数据包到目标主机过后, 终于可以建立连接了; 根据 ip port 进行 tcp 握手
9. ssl / tls 握手
10. 浏览器生成 http 请求, 握完手之后 (连接建立完毕之后), 才会发 application data
11. server 处理 http 请求, 在 tcp 连接上发送 http response
12. 浏览器收到 http response, 解析返回, 渲染页面, 加载资源; dom tree 啥的 

未覆盖:
- 网卡、 switch 之类的
- 数据包长啥样
- 主机收到数据包之后, 网卡、操作系统、内存 之间是怎么交互的

# 浏览器本身
## 解析
以 `www.example.com` 为例子
在浏览器中输入一个 url, 首先浏览器会 **解析** 这个 URL, 解析什么内容?
- URL 中涉及到的协议
- URL 中的 host 等信息

## 检查缓存
- 浏览器检查有没有缓存这个 http 请求对应的资源


解析完之后, 如果是个 http 的协议, 那浏览器会 **生成 http 请求**


# 应用层
## HTTP
http 是个应用层的协议, 一般都基于传输层的 tcp
http message 包含:
- 请求头, 请求方法, 目标 url
- 请求长度, 可以接受的数据类型
- 协商缓存相关的请求头
- 其他请求头
- 请求体数据

## dns
有了 http 请求过后, 需要通过 DNS 来查询请求 host 中域名对应的 IP 地址
dns 是应用层的协议, 一般都基于 udp

### 缓存
- 浏览器会先查询自己是否已经对这个 域名的 IP 地址 有缓存了
- 浏览器没有缓存, 那会查询 OS 的缓存
- 都没有缓存的情况会进行 dns 查询
### dns 查询
- 客户端会先向 本地的 **域名服务器** 进行查询 
	- (本地的域名服务器一般是指自己的 ISP 的服务器, 也可以是客户端自己配置的 google 或 cloudflare 1.1.1.1 啥的)
- 如果 本地域名服务器 存有这个 域名对应的 IP 地址就会直接返回
- 本地的域名服务器如果没有缓存的话, 就会充当一个 **resolver** 的角色, 对 域名的 IP 地址 进行查询
查询顺序:
- 从 根域名 开始, resolver 向根域名发起查询请求, 根域名服务器返回对应的顶级域名服务器的 **域名和 IP 地址**
- 顶级域名服务器再返回 权威域名服务器 的地址
- 权威域名服务器能够返回对应域名的 IP 地址
- root -> top level -> authoritative
- resolver 最后向客户端返回 IP 地址
note:
- 整个查询的过程对于 客户端 来说是 **迭代 iterative** 的, 但是对于 resolver 来说是 **递归 recursive** 的
- 一共只有 13 个 root domain name server, 客户端的操作系统里一般都有存这 13 个 server 的地址

# 传输层
## tcp
tcp 是个 面向连接的, 可靠的, 面向数据流 的传输层协议

http 请求的 header 和 payload 被操作系统传到传输层, 在 tcp 这边进行进一步封装成 tcp segment
tcp segment 包括:
- source port, destination port
- seq number, ack number
- flag: syn, ack, fin 等 6 个
- window size
- checksum
- http 请求的信息被封装到 payload 里了

### 三次握手:
- client hello, 发送 syn 请求建立连接
- server hello, 同一条消息里发送 ack 来 acknowledge 收到了 client 的 syn, 同时自己发送一个 syn 来表示建立连接
- client 发送 ack 来 acknowledge 收到了 server 的 syn

## ssl / tls
ssl / tls 是介于 传输层 和 应用层 之间的一个协议, 在 osi 里被定义成 **会话层 session layer**
定义了 client 和 server 之间 **协商密钥和认证身份** 的方式

### 在建立 tcp 连接后四次握手
- client 发送 client hello, 包含 tls version, cipher suites, random number
- server 发送 server hello, 包含 tls version, cipher suites, random number 和 ssl certificates
- client 收到 server 的 ssl cert 之后会进行校验, 通过 chain of trust; 同时生成一个 随机的 pre-master key 并且用 server 的 public key 加密 pre-master key
- client 发送 加密后的 pre-master key, change cipher spec 来告诉 server 要开始使用加密, 然后 done
- server 发送 change cipher spec, 同意加密
- server 用自己的密钥解密 pre-master key, 结合两个 random number 来生成 会话密钥

### chain of trust
- client 会根据收到的 ssl cert 一层一层地 **往上** 校验
- client 从网站证书开始, 如果还没信任网站证书, 那就会看是否已经信任了颁发这个网站证书的 **中间证书 intermediate cert** (中间证书可能有多个)
- 如果还没信任这个中间证书, 那就会往上查找, 看是否已经信任了颁发这个中间证书的 **根证书**
- 如果不信任根证书, 那整条链就会断掉, 根证书是个 **trust anchor**

## 再次连接
- 再次连接的时候, 如果是 tls 1.2 1.3, 那可以实现 1 RTT 甚至 0 RTT 的握手. 

# 网络层
## IP
- 如果 destination ip 地址是在同一个子网的话, 可以直接进行 ARP
- 如果 destination ip 地址是在其他子网里的话, 需要路由器进行转发
	- 客户端查询 ip 路由表, 查看应该往哪里发这个数据
	- 如果路由表里没有相关信息, 会使用默认路由, 也就是这个子网的 gateway
	- 如果没有子网的 gateway, 那数据包会被丢弃
从 传输层 传下来的数据被 IP module 封装成 IP packet, IP packet 包含:
- source IP, destination IP
- 传输层的协议类型
- TTL
- checksum
- 其他信息
IP packet 往下传到 data link 层

# data link layer
## Address Resolution Protocol
- data link layer 的 protocol
- 把 IP 地址 map 成 物理设备的 MAC 地址
### 缓存
第一步是查看是否有缓存, 有缓存直接用, 没有缓存则发送 ARP 请求

### ARP 工作原理
- 客户端在子网中 **广播** ARP 请求, 请求中包含 **destination IP, source IP, broadcast MAC ff-ff-ff-ff-ff-ff destination MAC, source MAC**
- 子网中的设备都在监听广播信息, 如果 receiver 在同一个子网中的话, receiver 会 **单播** 回应自己的 MAC address
- 如果 receiver 在其他子网中的话, ARP 请求中的 destination IP 会是 default gateway 的 IP, default gateway 会回应自己的 MAC 地址
- 有了目标的 MAC 地址之后, 从网络层传下来的 IP packet 就可以被 封装成 ethernet frame 了

# 物理层
## 网卡和 switch
通过网卡和 switch, 数字信号转化成电信号, 在物理链路上传输出去

# 网络中跳转
## broader gateway network
用来实现数据包在网络之间的跳转, 找到 routing 的最佳路线

# 接收方
接受方和发送方的过程是相反的:
- 接受方子网的路由器收到数据包
- 路由器根据 ip 地址进行 ARP 请求, 找到目标设备的 MAC 地址
- 目标设备收到数据之后, ip module 解析 ip packet, 判断是否为自己的 packet
- 是自己的 packet 的话, 会根据请求头中的 tcp/udp 来判断如何进一步处理数据
- tcp segment 被传到 tcp module, 解析是什么 port
- 根据 port number, tcp segment 操作系统上对应的 进程 所处理
- 应用再把这些 tcp segment 拼凑回 http 信息, 做出相应的响应
- 处理完之后生成 http response
- http response 又经过这一整套, 发送回给客户端
# receiver 收到数据包后
- receiver 的底层 ethernet 收到数据包
- 操作系统会根据数据包的包头里的类型决定, 是由 ARP module 处理还是 IP module 处理
	- 神奇, ARP 和 IP 都不是同一层的协议
- IP module 根据数据包的包头里的类型决定, 是由 TCP module 处理还是 UDP module 处理
- TCP、UDP module 根据数据包包头的类型决定, 数据包要去到哪个 **端口**


# linux 是怎么处理数据的? (TBC)
- 收到数据, napi 来处理
- 写到 ring buffer, 


> 图 4-2 是网卡接收到信息后，把信息发送给用户态的进程处理的流程图。这个过程可以分为四步来理解：
> 1. 网卡接收到一段数据，通过 DMA 方式写入内存
> 2. NIC 向 CPU 发出硬件中断请求，告诉内核有新的数据过来了
> 3. Linux 内核响应中断，系统切换为内核态，处理 Interrupt Handler，从 RingBuffer 拿出一个 Packet，然后解析数据，找到这个端口对应的是哪个 PID，然后包装成 socket 发送给那个进程
> 4. 系统切换为用户态，用户进程处理内核传递过来的 socket 数据
[credit](https://pphc.lvwenhan.com/part-three/web-servers/section-3)

![[Pasted image 20241218085002.png|500]]


# 问题
- dns 查询的时候, 每次的域名服务器返回的是下一级域名服务器的 IP 地址吗?
	- 是的, 返回下一级域名服务器的 domain, ip, 和一些其他信息
- chain of trust 是从 根证书 开始从上到下 (像dns一样) 还是从 下到上?
	- 从下到上, 如果已经手动信任了网站的证书, 那就不需要再往上走了
	- 所以不能随便信任证书哈
