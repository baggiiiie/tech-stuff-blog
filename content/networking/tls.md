# visualize SSL/TLS
https://tls12.xargs.org/

# SSL / TLS (secure socket layer / transport layer security)
> [!note]
> SSL / TLS 本质是一种 **协议**, 是个 应用层 和 传输层 的 **中间层**, 但没有说一定要 TCP 才能实现 TLS, 也不一定是服务于 HTTP; 但 TLS 还是 **强依赖于 TCP 的稳定性的**  
> **DTLS** 是个 TLS 的变体, 这个协议是走 UDP, 但不常见. 估计实现上也有很多 nuances  

协议: 位于 **应用层** 和 **传输层** 之间, socket;
SSL \ TLS 在 osi 上是 **presentation layer** 的协议, **不是 session layer**, [wikipedia 上是这么说的](https://en.wikipedia.org/wiki/List_of_network_protocols_(OSI_model)), 但是感觉好像到处说法不一. 
握手阶段: 非对称加密, RSA, 只是用来 **协商密钥** 的, 而不是用来 **加密会话信息** 的
会话阶段: 对称加密, AES (更快)
SSL 证书: CA 颁发

## secure SOCKET layer
本身 SSL / TLS 是 **利用** 了 linux 提供的 socket API, 但是作为一个协议, SSL/TLS 并没有 **重新实现 socket 的功能**
- SSL/TLS 使用 socket 来: a. 建立初始连接 b. 发送加密后的数据 c. 接收加密的数据
- 应用程序不需要直接处理加密、解密或证书验证等复杂的安全细节。

编程接口：
- 许多编程语言和库提供了 SSL/TLS 的封装，如 Python 的 `ssl` 模块或 Java 的 `SSLSocket`
- 这些接口通常与普通 socket 接口类似，但内部处理了所有的安全细节。
![[Pasted image 20241020181700.png|500]]
## 握手阶段
不同的加密算法的握手可能会不同, 这里讲的是 **RSA**

4 次握手
- client hello
- server hello
- client 信息交换
- server 信息交换
具体流程:
client hello:
- SSL TLS 版本
- client 的随机数
- 加密套件 encrypt suite for server to choose
- done
server hello:
- SSL TLS 版本
- server 的随机数
- 选择一个加密套件返回给 client
- server 证书 (证书里包含 public key)
- done
client 验证 server 的证书
- 本地是否已经信任了这个证书
- 生成 pre-master key 并 用 server 的 public key 加密
client 验证完之后:
- 发送一个 **pre-master secret**
- 用 server 的 **public key** 加密这个 **pre master secret**
- 发送 "ChangeCipherSpec"消息,表示将切换到加密通信
- 发送 finished, 结束 TLS 握手
server
- 结束握手

![[Pasted image 20241020122017.png|500]]

## 为什么要发随机数?
[问题](https://www.kawabangga.com/posts/5330):
> browser拿到server回傳的證書，並且用CA的公鑰驗證簽名後，就可以確認通訊的對象是server了。

显然这个逻辑是不对的:
- server 的证书不是 secret, 是可以直接下载的 (证书上有 public key)
- 按照上面的逻辑, 如果 attacker 获取了证书并且和 client 建立连接, client 只验证证书的话, 那 client 就无法分辨出 attacker 了
	- 换句话说, 仅仅只依靠 证书, 是不能判断谁是 证书的 **持有者** 的 -》 合法的证书不代表持有者是合法的
- 因此需要 **随机数**: 
	- client 发送随机数, 用 证书上的 public key 加密
	- server 需要用自己的 private key 解密之后传回给 client
	- 这样 client 才知道 证书的持有者 也是 private key 的持有者
- 当然, 如果 private key 被 compromised 了, 那也就没办法了

> [!note]
> !! 上面对随机数的解释好像不对.  
> ”如何验证 cert 的持有人就是真正的 server“ 这一点, 好像是通过 ”使用 cert 上的 public key 来解密 cert 上的 signature“ 来实现的, 参考这个文档中 browser 的那部分 https://scotthelme.co.uk/cross-signing-alternate-trust-paths-how-they-work/   




## 为什么整个握手都被监听的, 监听者还是不能解密?
关键在于 **pre master secret**
- pre master secret 是 client 用 server 的 public key 加密的
- 只能用 server 的 secret key 解密
- server 的 SK 不会在这个握手过程被流传出去

知道了 server 的 PK 和 加密套件, 也不能解密 premaster secret 吗
- 非对称加密: key 不是对称的, PK 和 SK 是不一样的, 是一 pair
- 知道 PK 和 加密套件, 也 **不能 逆向计算**
- 
## premaster key 是怎么来的
取决于算法
- 如果是 RSA, 这个 premaster key 是 **客户端随机生成**
- 如果是 Diffie-Hellman, 则有其他方法
前向保密
- RSA 不提供 **前向保密**, 如果 **服务端的私钥** 泄漏了, 那之前的会话也可以被解密
- Diffie-Hellman 提供 前向保密, 每个会话都有临时密钥. 如果服务端的私钥泄漏了, 之前的会话也不会被解密

## RSA 和 Diffie-Hellman
> [!note]
> RSA: **客户端生成** pre master secret, 用服务端的公钥加密之后 **传输** 给服务端; 服务端的密钥泄露之后, 所有会话都可以被解密, 所以没有 forward secrecy; **传输密钥** 这个过程有风险.  
> 
> Diffie-Hellman: 密钥不是由一个 single party 生成的. **每次会话** 客户端和服务端都会各自 **重新生成** 公钥和密钥; 密钥是本地计算出来的, 不涉及传输

RSA 的缺点
- 如果会话被监听且 **录制** 了, 即便监听者现在没有 server 的 private key, 以后只要获取到了 server 的 private key, 就能够把所有的会话都解密

### Diffie-Hellman
- **symmetric key 从来没有离开 client 和 server (symmetric key 没有被传输)**
- 所以即便会话被监听且 **录制** 了, 即便 interceptor 拿到了 server 的 private key, 也不能解密
- 需要 symmetric key 才能解密
基本流程:
- alice 和 bob 分别随机生成公钥和密钥, 把公钥发给对方
- 双方通过自己的密钥和对方的公钥能够计算出一个 session key
> [!note]
> 1. **服务器和客户端各自生成一个临时的密钥对**（ephemeral key pair）。
> 2. **两者交换公钥**，然后各自计算出一个共享密钥 **K**（session key）。

forward secrecy 向前保密性:
- **不是 DH 本身的固有特性**, 而是通过 **临时密钥 (ephemeral key)** 来实现的 ^dh-forward-secrecy

### 用了 DH 是不是就不需要 pub/pri key pair 了?
问题:
- 在上面这个过程里, 好像没有用到 客户端 和 服务端 的 pub/pri key pair?
- 每次对话的 key pair 都是随机生成的, 为什么还需要 persistent 的 key pair 呢?  
-> 因为需要验证 **服务器的身份**
- 临时的密钥只是用来建立一个安全的加密通道的 (钥匙协商), 并不能验证服务器的身份
- 所以还是要有 pub/pri pair 来确定客户端连接的服务器是 **真正的服务器**


## 几种协商方式, 待拓展
在 TLS/SSL 握手过程中，Pre-master secret 的生成方式取决于使用的密钥交换算法。主要有以下几种情况:
 1. RSA 密钥交换:
- 客户端生成一个 48 字节的随机数作为 pre-master secret
- 使用服务器的公钥加密这个随机数
- 将加密后的数据发送给服务器
- 服务器用私钥解密得到 pre-master secret

2. Diffie-Hellman(DH)密钥交换:
- 客户端和服务器各自生成 DH 参数(大质数 p、原根 g、私钥)
- 双方交换公钥信息
- 双方使用对方的公钥和自己的私钥,通过 DH 算法计算出相同的 pre-master secret

3. ECDH(椭圆曲线 DH)密钥交换:
- 与 DH 类似，但使用椭圆曲线运算替代模幂运算
- 性能更好，密钥更短

获得 pre-master secret 后:
1. 双方使用 pre-master secret + ClientRandom + ServerRandom 生成 master secret
2. 从 master secret 派生出后续通信需要的会话密钥

## 向前保密性 forward secrecy
- forward secrecy 本身不是 一个算法的特性
- ![[#^dh-forward-secrecy]]
- 每次会话的密钥都会在会话结束之后被销毁

为什么要叫 “forward secrecy”
> "forward"就是指"面向未来的"安全性，强调即使过去的密钥泄露，未来的通信仍然是安全的。

## asymmetric & symmetric key
asymmetric, 如 RSA:
- 加密和解密用的是不同的密钥, 一对 公钥 密钥 pair
- 计算速度慢
- 但能够解决密钥分发的问题, 
- 需要的密钥少, n 个人通信只需要 n 个密钥 (?)
	- 不太理解
	- 这样理解对吗: 每个人都只需要保管好自己的密钥就够了?
symmetric, 如 AES:
- 加密解密是同一个密钥
- 计算速度快, 开销小
- 难度是, 要怎么样安全地传输这个密钥?
- 密钥多, n 个人通信需要 n*(n-1)/2 个密钥
	- 我要和 n 个人通信, 我就要保存 n 个密钥
	- n 个人之间要相互通信, 就是 n*(n-1)/2

## 会话阶段
- 会话阶段的 密钥 是通过 client random, server random, pre master secret 计算出来的
- 会话的时候只有一个key, 会话的时候就是 **对称加密** 了

> [!note]
> 在 TLS 中, RSA 的作用是 **协商、交换密钥**, 它本身是 **不用于加密信息** 的   
> 是通过 RSA 交换好 密钥 之后, 再用 AES 算法 结合 密钥 进行加密的    
> 
## session resumption
一次 SSL 握手需要客户端和服务端各发2条信息, 需要两个roundtrip time
- 基于 session id 和 session ticket 的 session resumption 能够 **减少 1 个RTT**

主要的 session resumption 的方式:
1. session id
2. session ticket
3. 0 RTT 

### session id (**session caching**):
- 第一次握手时, 服务端会记录一个 session id, 并且返回给 客户端
- 后续握手时, 客户端只需要发送 client hello 和 对应的 session id
- 服务端可以在自己的 **缓存** 里根据 session id 查到上一次握手的参数, 比如上一次会话的 secret key
- 服务端验证过后, 再返回一个 server hello, 就可以开始会话了
- 需要 1 RTT, 需要服务端对 session id 有 缓存

### session ticket (**stateless resumption**):
- 不需要服务端来储存所有的 sessino id 
- 在第一次连接的时候, 服务端会用自己的一个 secret key 把握手协商好的参数都加密起来, 然后发给 client
- 重连的时候, 客户端发 client hello 并且带上 session ticket
- 服务端用 密钥 decrypt session ticket 就可以得到之前已经协商好的参数, 并且恢复会话
- session ticket 是安全的, 因为 ticket 由 client 保存, 但只有 server 才有 decrypt 的 secret key

-> 如果有一整个 server cluster, 那么这些 server cluster 都共用这一个解密 session tix 的 secret key, 就可以实现客户端和服务器 **集群** 里的所有机器都能够快速建立 SSL/TLS 连接了
-> 但是就需要 server 集群有个能够 **安全地** 同步这个 key 的方法, 并且要定期 更新


### 0 RTT (**TLS 1.3**)
- 和 session ticket 差不多, 是有个叫 pre-shared key 的东西
- 客户端重连时 **发送 client hello** 的时候就可以开始传 **应用数据**
- 

## TLS False Start
是什么
- 回顾 SSL/TLS 的握手过程:
	1. client hello (TLS version, cipher suites, random no)
	2. server hello (TLS version, cipher suites, random no), cert, done
	3. client finished, change cipher spec, premaster key
	4. server finished, change cipher spec
- false start 是在 **第3步** (未等 server 回复 finished) 就发送 application data
- 好处: 节省了一个 RTT
- 坏处: 如果 server 拒绝连接, 那提前发的 application data 就丢了

只有支持 forward secrecy 的加密算法才使用 false start
- 普通的 RSA 不支持
- 不用 forward secrecy 的算法其实也没问题, 因为 TLS false start 的本质 只是 **提前一点发送消息, 消息已经被加密了**
- 只不过 private key 被窃取过后就被破密了
- 因此大部分的浏览器都要求要有 forward secrecy 的 ciphersuite 才会允许 false start

> [!note]
> session resumption 是在第一次建立连接 **过后** 才能节省 RTT, false start 在 **第一次连接** 就节省了 1 个 RTT


## chain of trusts, 信任链
1. 首先 os 和 browser 会有一批 built-in root CA
2. 一些 intermediate CA 会从 root CA 那获取证书 (intermediate CA 的证书里有 root CA 的 private key signature)
3. server 的 cert 就是从 intermediate CA 那里获得的 (server cert 里有 intermediate CA 的 private key signature)
原理
- 客户端信任 root CA
- intermediate CA 里有 root CA 的 private key signature, 客户端就可以信任 intermediate CA
- server cert 里有 intermediate CA 的 private key signature, 客户端就可以信任 server CA 
- 即便 client 已经信任了 server cert, 每次连接的时候也是要验证:
	- cert 是否过期、是否被吊销
因为整条链都基于对 root CA 的信任, 所以 root CA 是 **trust anchor**, 信任锚

> [!note]
> 正常的 ssl / tls 握手中, 只要客户端信任了 根证书, 就可以完成握手

哪里可能会出问题
- intermediate CA 被攻击, 被 compromise
- server 的 private key 被 compromise, CA 把 server cert 给 revoke 了
- 客户端自己手动信任了网站的证书 

client 手动信任证书:
- claude: 对于自签名证书或内部使用的证书，如果 client 明确地将其添加到可信证书存储中，验证过程会直接通过，基本上跳过正常的证书链验证步骤


## TLS 1.1, 1.2, 1.3
![[Pasted image 20241127205841.png|500]]
[wikipedia](https://en.wikipedia.org/wiki/Transport_Layer_Security)
- SSL 是曾经的一个 **独立的协议**, 为 TLS 铺路; 
	- 他俩本质上是 **同类协议**, TLS 基于 SSL, TLS 1.0 本来是叫 SSL 3.1 的
- TLS 1.0 和 1.1 都已经不用了, 有漏洞, 不安全
- 现在只有 1.2 和 1.3 在用
### TLS 的版本演变
太多数学上的东西了, 简单来说就是加密算法不断地在进步  
- TLS 1.0 修复了 SSL 3.0 的安全问题
- TLS 1.1 又修复了 TLS 1.0 的安全问题
- TLS 1.2 引进了 SHA-265 这个哈希算法
- TLS 1.3:
	- 移除了不安全的算法, 比如 RSA (RSA 咋就不安全了, 因为不是 向前保密 吗)
	- 增加了 向前保密
	- 简化了握手

### 深入学习下 TLS 1.3 

#### 算法上的变更
[RFC 8446](https://datatracker.ietf.org/doc/html/rfc8446)
[wikipedia 中文, 对比还挺完整的](https://zh.wikipedia.org/wiki/%E5%82%B3%E8%BC%B8%E5%B1%A4%E5%AE%89%E5%85%A8%E6%80%A7%E5%8D%94%E5%AE%9A#TLS_1.1)
- 移除不安全的算法
	- RSA 被移除了, 静态 Diffie Hellman 被移除了
	- ~~椭圆 diffie-hellman 也被移除了 (看来不只是向前保密的问题?)~~
	- 椭圆曲线 DH (Elliptic Curve DH ECDH) 好像是和 RSA 分离了? 这个分离怎么理解?
	- 原来的算法会受到 BEAST、POODLE 和 CRIME 这几种攻击, 过后再学学具体是个啥
- 引入新算法:
	- 引入了个叫 AEAD 的算法
- 强制使用 向前保密


#### 握手流程
简化握手:
- 原来 TLS 1.2 的握手需要两个 RTT:
	- client hello
	- server hello
	- client change cipher spec (client 校验 server ssl cert 之后)
	- server change cipher spec
- TLS 1.3 支持 **初次握手 1 RTT, 后续握手 0 RTT** (这里说的是 TLS 握手, 不包含 TCP)
TLS 1.3 握手:
- 和 [[Personal/learnings/technical/netowork/http#**0-RTT 是怎么实现的**|http]] 这里一起学习
- 注意, 传输层 该怎么握手还是怎么握; 只要是用 TCP, 那就会有至少 1 个 RTT
- server hello 过后的信息就开始被加密了 (实际上 server hello 完了之后, 握手就完了, 只要 client 再验证下 server 的 cert 啥的就完事了)


下面这是 RFC 8446 的官方图:
- 可以看到握手过程只有 client hello 和 server hello
- server hello 完之后, server 都可以开始发 application data 了
- client 自己再 authenticate 一下 server 就完成握手了
- 当然, server 也可以 optionally authenticate client, 如果有需要的话
- client 和 server hello 时发的内容简单来说和 TLS 1.2 也差不多
	- TLS version
	- supported cipher suite
	- random number
	- 还有一些其他用来实现加密的参数啥的

后续握手:
- client 会直接发一个上一次链接时使用的 pre shared key PSK (这些和链接相关的信息可以统一理解为 session ticket)
- client 发出第一条消息的时候, 就已经包含了 加密的 application data
- 这些 application data 叫做 early data
	
![[Pasted image 20241127234448.png|500]]
![[Pasted image 20241128094939.png|500]]


问题:
- 一定要用 QUIC 才能实现 0-RTT 吗? 
	- 如果要实现 **传输层 + TLS** 的 0 RTT, 那就得要 QUIC
	- 如果只是在谈 TLS 的 RTT, 那传输层该怎么握手, TLS 也管不了
	- TLS 1.3 只能保证自己握手的 0 RTT
- http3, quic, TLS 1.3 的耦合、依赖关系是怎么样的
	- 从下面这张图可以看到, 其实本身是不同层的协议, 
	- 从理论层面上看, 技术上这些协议没有太多强依赖
	- 不过实际上, 因为协议的定义问题, 可能 http3 是基于 quic 的, quic 又要求 TLS 1.3
![[Pasted image 20241006153453.png|700]]

> [!note]
> 注意, 0 RTT 会有 **重放攻击 replay attack** 的风险  

#### replay attack
![[Pasted image 20241127212907.png|500]]
首先啥是 replay attack:
- attacker 录制了一段有效的、正常的网络传输
- attacker 把这段网络传输再原封不动地传输一次给 server
在 TLS 1.3 中:
- 因为允许 0 RTT, first flight of data 就已经包含了 application data, 所以 attacker 可以直接重放这段 data, 就可以重复 client 的请求

解决 0 RTT replay attack:
- 不允许 session ticket 被重复使用, single used session ticket
- 限制时间窗口, 即 session ticket 的有效期
- 只允许 幂等操作 idempotent, 因为 幂等操作 的影响相对较小



## BEAST、POODLE 和 CRIME (TODO)
## TLS 证书
### 自签名证书
- 任何一台安装了 openSSL 的计算机都可以生成一个自己的 TLS 证书
### 第三方签名的证书
- server 自己用 openSSL 生成证书, 保护好自己的 private key
- 把证书上传到 CA, CA 用自己的 根证书 或 二级证书 来签名 server 自己生成的证书

## TLS 加密都加密了些啥东西
- http message 的 payload 会被加密
- http header 也会被加密
不会被加密的东西:
- [server name indication](https://en.wikipedia.org/wiki/Server_Name_Indication): 服务器的 hostname
- source、destination ip、port
TLS 连接建立好了之后, 整个 http message 都会被加密
- TLS 加密的是 TLS 以上 (传输层以上) 的协议的数据 (主要就是 http message), 不会加密 ip packet header、ethernet frame header 这些
- 以下协议可以加密 ip packet、ethernet frame:
	- **VPN（虚拟专用网络）**: VPN 可以加密整个 IP 数据包，包括 IP 头和 IP 数据部分，然后将其封装在新的 IP 包中进行传输。
	- **IPsec**: 用于在网络层对 IP 数据包本身进行加密和验证。可以加密 IP 包的有效载荷部分，并且可以选择性地加密 IP 标头信息。
	- **MACsec**: 用于在数据链路层对 MAC 帧进行加密。
	
	
## 问题
- SSL 是基于 socket 实现的吗
	- SSL 应用了 socket 的功能, 在 socket 之上实现
	- socket 本身只负责传输、接收数据, 数据加密是 TLS 完成的
- premaster secret 是怎么生成的
	- client 随机生成
