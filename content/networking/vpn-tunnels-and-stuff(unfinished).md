## security issue
为什么 public wifi 不安全?
- 用户 连接 wifi 使用 internet 的环节:
	- 连接上 wifi, 通过 DHCP 和 DHCP server 获取 设备的 ip 地址和 dns 服务器
	- 通过 ARP 获取 gateway MAC 地址
	- dns 获取要访问 server 的 ip 地址 
	- https: TLS 握手, 数据传输
- 不安全的环节:
	- DNS spoofing: attacker 可以冒充 DHCP server, 用户通过 DHCP 拿到的是假的 dns server; 后续 dns query 的时候拿到的是假网站的 ip
	- ARP spoofing: attacker 冒充 gateway, 伪造 ARP 的 response, 让用户把 ip packet 发到假的 gateway 的 MAC 地址
- 如果 用户和服务器 是 https 连接的话, 实际上 本身 https 是不会有太高风险的
	- 这里的风险都是在 https 之前就存在的
- 其他风险就是, dns query、TLS 握手这些, 很多情况下都是 明文 的, attacker 通过监听也能获取到这些信息

vpn 为什么能够提高安全性?
- vpn tunnel: 数据 在用户和 vpn 之间传输都是 加密的
- vpn 并不能阻止 dns spoofing, arp spoofing; 只是因为使用 vpn 后的数据加密, 即便 attacker 实施了 attack, 数据安全也不会被 compromise
- DNS 安全: 连接了 vpn 之后, 一般是由 vpn 来完成 dns lookup; 即便用户拿到假的 dns server, 也不会使用
- ARP: 即使用户通过 ARP 拿到的是假的 gateway, 用户发送出去的数据也都已经加密了, attacker 也解密不了
- attacker 监听的时候, 只能知道用户在和 vpn 发消息, 就不知道别的消息了


## vpn
### definition

首先 vpn 是 virtual private network, 按照 [wikipedia](https://en.wikipedia.org/wiki/Virtual_private_network) 说的, VPN 是在 extending a private network.  
就是把一个原来的 private network, 通过 *某种技术*, 延伸到其他 network 里了. 

### 工作原理
我的理解:
- 本来是 client <-> server 相互发消息, 现在中间多了个 proxy 来代替发消息 (转发, 但不只是单纯的转发, 还有 data packet 的 transform -> **tunneling**)
- client <-> proxy <-> server

简单讲讲 Tunneling:
- data packet 的 封装 encapsulation 和 转发 forwarding 技术
- 封装不是像 NAT 那样替换 dest/src ip:port, 而是把原来的 IP packet 整个变成 payload, 再加上个 header
	-> 是把原始的数据包整个 (header+payload) 都包装起来了
- 比较高级的用法是 
	- ip in ip (让 ipv4 和 v6 之间通信) (把原来 ipv4 的包整个作为 payload, 再封装个 IPv6 的 header)
	- ipsec


中间有个 proxy
- 客户端发送 packet 到 proxy (proxy 和 client 之间的 data transmission 可能会有加密)
- proxy 把 packet 的 source IP:port 给改了
- proxy 把 新的 packet 发给 server
- server 处理完之后, 把返回发给 proxy (packet 里的 destination ip:port 是 proxy; server 根本都不知道 client 的存在)
- proxy 再把 packet 的发给 client

影响
- 经过 vpn 这么一出, 对 proxy provider 是个 bandwidth 和 hardware 的考验
- 对 client 是个体验上的考验 (proxy 的处理要时间, proxy 的 bandwidth 要共享, proxy 和 client 的地理位置有距离)

### TCP 连接
- **从 TCP 连接的角度上看, client 和 proxy 之间有个连接, proxy 和 server 之间有个连接**

### vpn 的模式

full
- 进出 client 的所有流量都经过 proxy
- 对 proxy 的带宽的消耗就很大了
- 所有流量都是走 tunnel (都是通过 proxy 的)

split
- 只有部分流量经过 proxy
- 假设 client 只是在用 incognito 看公开的 livestream, 这条 traffic 里没有什么敏感信息, 也不需要在公司的 private network 里, 那何必要用公司的 proxy 呢
- 部分流量走 tunnel, 部分流量

bridge mode (aka layer 2 bridging)(TODO)
- 原理: > "instead of encapsulating IP packets, bridge mode encapsulates full Ethernet frames within the VPN tunnel" [openVPN](https://community.openvpn.net/openvpn/wiki/OpenVPNBridging?__cf_chl_tk=Tdu5YAqDiQxZ3pK3nd8ttcdXJE4wlKokK6U_Eha3sbc-1742189870-1.0.1.1-QA6FRrNKRPwes8JUqAftGqKUuEi.nu45W75yxbzKFLs)
- gpt:
	- VPN 服务器会创建一个虚拟的二层网络（类似交换机），使客户端就像直接连接到本地网络一样。 ^1a55ab
	- 客户端会获得与 VPN 服务器所在网络相同的 IP 地址（不像隧道模式，客户端 IP 仍然独立）。
	- 适用于局域网扩展、远程办公等。
- full 和 split mode 封装 IP packet, 让设备觉得自己和 private network 在同一个 ip network 上; bridge mode 封装 ethernet frame, 让设备觉得和 private network 在同一个 physical network 里

### 为什么 经过了 VPN 之后就更安全了?
- 对于非 https 的数据
	- 任何人都可以监听、解密, 不安全
	- ISP 就可以 spy on you; 一些信息, 比如说上面说的, 看公开的 livestream, 虽然不敏感, 但是也未必想让 ISP 知道你在干啥, 所以就想整个 vpn 来加密下
	- 这个时候 vpn 的作用是 在 client 和 proxy 之间加密; client 走出自己的子网的时候依靠 router 和 isp 的服务, 和 vpn 先建立个连接, 把原本不加密的 http 请求加密下
	- client <-> proxy 是加密的, proxy <-> server 不是; 因为如果 server 支持加密的话, 那 client 和 server 加密好就行了, 就不需要 vpn 了
	- 这里的加密也只是半段的加密, 为了走出 isp, 不被 ISP 监控罢了
- 对于 https
	- 本身都已经加密了, IP packet 里的 payload 是安全的
	- 但是 IP packet 里的 header 是不加密的 (加密了 header, 加密了 dest/source ip:port 还咋传数据), ISP 还是可以 spy on you, 知道你在访问啥网站, 虽然不知道具体访问的内容
	- 有了 https 还走 vpn, 为的是把自己 IP packet 的 header (dest/src IP 啥的) 给藏起来; 本身已经加密的数据, 二次加密带来的安全性提升其实意义不大, 但原本没加密的 Meta data (header) 现在被加密了
	- 有 VPN 之后, ISP 最多就是看到 client 正在连接 VPN

- 还一点就是 IP 隐藏
	- 通过 proxy 过后, client 就相当于自己被隐藏起来了, server 和 中间的 attacker 是不感知到 client 的存在的
	- IP 隐藏之后就不会暴露自己的真实地理位置了

> [!note]
> 要注意的是, 在 “加密” 这一点上, 主要是把 “所有人都看得到的信息“ 变成 **“只有 VPN 才看到的信息“** (VPN 就相当于你的 server 了, 当然能看到 client 在发啥; client 相当于就是在给 proxy 发消息, 告诉 proxy 去帮忙请求 server).  


这就是为什么 [reddit](https://www.reddit.com/r/selfhosted/comments/133rr6n/about_cloudflare_tunnels/) 上都在诟病 [cloudflare tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) 了
- 用了 cloudflare 的 tunnel, 就相当于是在说 “我就是要和 cloudflare 建立连接, 让 cloudflare 帮我干活”
- 那么 cloudflare 当然是知道你在发什么数据的了. 
- 在 `self-hosted server <-> cloudflare server` 这条路上是有加密的, 途中的人只看得到加密的信息, 但 CF server 就是 self-hosted server 的 destination
	- 相当于是 SH server 和 CF server 建立连接了
- 而在追求 privacy 的情况下, 是希望在 `self-hosted server <-> client` 这条路上都是加密的 
- 需要在 `self-hosted server <-> client` 这条路的两端再协商一个加密协议, 才能防止 CF 看到加密信息

## tailscale 的 DERP 是怎么样 relay 的?

Tailscale 的 relay server 不会看到它转发的数据包的内容吗? 不会有 CF 的这个问题吗?
- Detour Encryption Relay Protocol
- Tailscale DERP server 只是个 relay / 中继 server
- 使用场景: 两台设备 无法 P2P 连接的时候作为中间的转发 server
	- 两台设备会先尝试 P2P 连接, NAT Traversal 失败的时候才会介入 DERP server
- DERP server 是看不到明文的, 转发的是 *WireGuard* 加密的数据
	- 在 sender 发送数据前, 就已经通过 WireGuard 加密了数据 (<mark style="background: #FF5582A6;">如何实现的? 不需要像 TLS 那样协商钥匙吗?</mark>)
	- 只有 sender 和 receiver 之间的 WireGuard 密匙才能解密
	- DERP 只能看到 **谁发给谁**, 看不到发送的内容
	- WireGuard 的加密是 **独立于 DERP** 的

### WireGuard [TODO]


## ssh 和 的原理是什么, 怎么样运用了 tunnel [TODO]

### ssh 和 tls 的关系是啥
- ssh 是 *应用层* 的 protocol
- TLS 是 *传输层* 的 protocol
- ssh 自己就是个安全的协议 (ssh is secure by default)
- ssh 和 tls 都是使用了 public key pair 这一套来完成钥匙协商的
	- ssh 没有用 tls 这样的 handshake (tls handshake 的目的是啥? 钥匙协商吗? 那为什么 ssh 不用握手都可以实现钥匙协商呢?)^qn-regarding-tls
	- ssh is self-contained, 不依赖 ssl cert, 也就不依赖 CA 这些第三方

> [!note]
> 实际上 ssh 和 tls 没啥关系, 唯一的联系是, 两者都是用了 public key pair 来实现 cryptography 的 network protocol

### 用账号密码登录的流程
- client (OpenSSH, Putty) 发起 TCP 连接
- server 回复自己的 public key 和支持的加密算法之类的
- 然后这里和 TLS 一样, 会进行钥匙协商, diffie hellman 等算法, 最终生成 session key
- client 把自己的 username 发过去 (encrypted), server then demands password
- client 把自己的 password 发过去 (encrypted), server verifies 
> Systems which require access for many users from many varying locations often permit password auth simply to reduce the administrative burden and to maximize access.  
> - [An Illustrated Guide to SSH Agent Forwarding](http://www.unixwiz.net/techtips/ssh-agent-forwarding.html) 

> [!note]
> ssh 用账号密码登录的时候, 是不要求客户端有自己的 public / private key pair 的.  

### 用 public key 登录的流程
> password authentication:
> - pros: easy to set up 
> - cons: allows brute-force password guessing; password must be entered every time; user might have the same password for different system, if one leaks, others are at risk
> ...
> To counteract the shortcomings of password authentication, ssh supports public key access.
> - [An Illustrated Guide to SSH Agent Forwarding](http://www.unixwiz.net/techtips/ssh-agent-forwarding.html)

流程:
前期准备:
- client 生成 private / public key pair
- client 把自己的 public key 拷贝到 `$HOME/.ssh/authorized_keys` 里
	- `ssh-copy-id user@server` 首次使用的时候, 是要已经知道 server 的账号密码才可以的复制过去, 复制的地址就是 `authorized_keys`
	- 或者直接用 `scp` 来 copy
	- 不 copy 的话, 每次都要账号密码登录
#### 连接建立阶段
 1. **TCP连接建立**
    - 客户端发起TCP连接请求
    - 建立三次握手，确立网络连接
2. **密钥和身份验证阶段**
    - 服务器检查客户端的公钥是否在 `authorized_keys` 文件中
    - 如果公钥不存在，有两种可能：
        - 要求使用用户名和密码登录
        - 如果服务器禁止密码登录，则拒绝连接
3. **密钥交换和版本协商**
    - 服务器返回：
        - 支持的加密算法列表
        - SSH协议版本
        - 服务器的公钥
4. **主机身份验证**
    - 客户端检查服务器公钥是否在 `known_hosts` 文件中
    - 首次连接时，需要用户手动确认服务器身份
#### 加密密钥协商
 5. **密钥协商**
    - 使用Diffie-Hellman (DH)或椭圆曲线Diffie-Hellman (ECDH)算法
    - 双方协商会话密钥
    - 后续所有通信都使用协商的密钥加密
#### 客户端身份验证
6. **服务器挑战**
    - 服务器发送随机challenge
    - 要求客户端使用私钥签名
7. **签名验证**
    - 客户端用私钥签名challenge
    - 服务器使用客户端公钥验证签名
    - 验证成功，建立安全连接

### pub/pri key pair 在这里是什么作用?
![[tls#用了 DH 是不是就不需要 pub/pri key pair 了?]]

- 在 ssh 里, 客户端 会把 服务端的 pub key 储存在 `$HOME/.ssh/known_hosts` 里
	- 服务端的 pub key 是长期不变的, 不是用于钥匙协商的 ephemeral key
- 在 key exchange 过后, 服务端的 私钥 会参与签名
	1. 通过 DH 交换的密钥生成个 hash value 
		- `H = hash(KEX_INIT_MSG, SERVER_PUBLIC_HOST_KEY, DH_SHARED_SECRET_K, SESSION_ID)`
			- **H** → 计算的哈希值，包含
			- KEX_INIT_MSG（密钥交换的初始化消息）
			- SERVER_PUBLIC_HOST_KEY（服务器的公钥）
			- DH_SHARED_SECRET_K（Diffie-Hellman 计算出的共享密钥）
			- SESSION_ID（用于防止重放攻击）
	2. server 用自己的 private key 再给上面生成的 hash value 加密一次 
		- 签名的本质是 server 的 private key 对 由信息生成的 hash value 进行处理的过程
		- `Signature = sign(Host_Private_Key, H)` 
	3. server 把 `Server_Public_Key, Signature` 一起发给 client
	4. client 查看 server pub key 是否在 `known_hosts` 里
		- 不在的话会问 用户, 是否要相信这个 pub key


### ssh agent forwarding
#### ssh agent
> It's a program that runs in the background and *keeps your key loaded into memory*, so that you don't need to enter your passphrase every time you need to use the key. The nifty thing is, you can choose to let servers access your local `ssh-agent` as if they were already running on the server.  
> - [Using SSH agent forwarding](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/using-ssh-agent-forwarding)

> SSH agent forwarding can be used to make deploying to a server simple. It allows you to use your local SSH keys instead of leaving keys (without passphrases!) sitting on your server.  
> - [Using SSH agent forwarding](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/using-ssh-agent-forwarding)

## todo

ssh 是第几层的 tunneling? ssh 一定用到了 tunneling 吗?

ssh 工作流程: 建立连接 -> 密钥交换 -> 身份验证 -> 通信
- client 尝试建立连接
- server 发送公钥给 sender
- 类似于 TLS 的交换钥匙 

ssh 和 https 不同的是, ssh 是双向认证的, 两对 public-private key; https 一般只是 client 验证 server. 

啥叫 port forwarding

ssh 的密码和 keys 分别是怎么工作的

- 已经连接过的 client 的 public key 会被 server 存到 `~/.ssh/authorized_keys` 里, 以后再连接的时候, client 会和 server 进行一次 *加密挑战*, 就不需要账号密码登录了

ssh 里的 fingerprint 是啥
ssh 第一次连接的流程是啥? 以后连接的流程是啥? 为什么我要提前下载 eos 的 private key?