```tasks
```

https://tailscale.com/kb/1218/nextdns
https://tailscale.com/kb/1403/control-d
https://github.com/pi-hole/pi-hole

## 工作原理
[[network stack#dns (domain name system)]] 
[[network stack#工作原理|查找顺序]]:
- local cache -> local resolver (ISP, DNS recursor) -> root -> top level -> authoritative 

### 实践!
执行 `dig +trace google.com`
[Using dig +trace to understand DNS resolution from start to finish | IBM](https://www.ibm.com/think/tutorials/using-dig-trace)
![[Pasted image 20250408225929.png|700]]


### dns search domain
- [?] 这个是怎么工作的, 我在 dns config 里添加了 `company.com` 这个 search domain 之后, 怎么知道哪条 dns query 会自动加上这个 search domain? 我 `nslookup blog` 的时候, 它怎么知道应该 look up `blog` 还是 `blog.company.com`


## different records
### A record / AAAA record
> "The "A" stands for "address" and this is the most fundamental type of [DNS](https://www.cloudflare.com/learning/dns/what-is-dns/) record: it indicates the [IP address](https://www.cloudflare.com/learning/dns/glossary/what-is-my-ip-address/) of a given [domain](https://www.cloudflare.com/learning/dns/glossary/what-is-a-domain-name/)."
- 把 域名 和 ip 地址 联系起来
- A record 只是 IPv4, IPv6 要用 AAAA record
- 一个域名可以有多个 ip, aka, 一个域名可以有多个 A record
Example:
![[Pasted image 20250407224524.png|500]] ![[Pasted image 20250407224646.png|500]]
- `use @ for root`: root 就是域名本身; 可以直接填域名, 或者填 `@`
```
@    A    192.0.2.1      # 把 example.com 指向这个 ip
www  A    192.0.2.1      # 把 www.example.com 指向这个 ip
```

### [CNAME record](https://www.cloudflare.com/learning/dns/dns-records/dns-cname-record/)
- 就是个 alias
- CNAME record 一定要指向 domain, 不能指向 ip 地址
- CNAME record 会触发下一轮 dns lookup: ![[network stack#^1ebf0c]]
- CNAME 指向的 domain 是这个 subdomain 的 **canonical name**
> For example, suppose blog.example.com has a CNAME record with a value of "example.com" (without the "blog"). This means when a [DNS](https://www.cloudflare.com/learning/dns/what-is-dns/) server hits the [DNS records](https://www.cloudflare.com/learning/dns/dns-records/) for blog.example.com, it actually **triggers another DNS lookup to example.com**, returning example.com’s IP address via its A record. In this case we would say that **example.com is the canonical name (or true name) of blog.example.com**.

- 一个 subdomain 通过 CNAME record 指向另一个 domain, 只代表这两个 domain 有同样的 IP, 但不代表这两个 domain 呈现的内容一样:
	- `blog.example.com` 和 `example.com` 可以是同一个 ip 地址, 但是这两个 domain 对应对的是两个不同的网站, 呈现的内容不一样
	- web server 会根据 client 请求的 url 来呈现网页内容
> A frequent misconception is that a CNAME record must always resolve to the same website as the domain it points to, but this is not the case. The CNAME record only points the client to the same IP address as the root domain. Once the client hits that IP address, the web server will still handle the URL accordingly. So for instance, blog.example.com might have a CNAME that points to example.com, directing the client to example.com’s IP address. But when the client actually connects to that IP address, the web server will look at the URL, see that it is blog.example.com, and deliver the blog page rather than the home page.

- 如果一个 subdomain 被用于一个 CNAME record, 指向了另一个域名 (成为了另一个域名的 alias), 那这个 subdomain 不能被用于其他 record (MX, TXT, SOA record etc)

### [others](https://www.cloudflare.com/learning/dns/dns-records/)
MX record and NS record
- MX: mail exchange record, directs email to a mail server (as mentioned above, cannot point to a CNAME record)
- NS: 


## dns sinkhole
[wikipedia - dns sinkhole](https://en.wikipedia.org/wiki/DNS_sinkhole):
- "dns servers hand out non-routable addresses for specific domain"
- non-routable address: `0.0.0.0`

### 怎么通过 dns 实现 ad block 的
首先, ad 的产生:
- 用户请求一个网站的 url
- 服务器返回内容, 内容中夹带了广告的 url
- 浏览器在处理服务器返回的时候, 会去请求这些广告 url
- 广告服务器返回广告, 浏览器把广告加载出来
通过 dns 实现 ad block:
- 把常见的广告 domain 都屏蔽掉
- 浏览器在请求这些广告 url 的时候, dns 就会返回个 `0.0.0.0` 这样的 non-routable address
- 广告就请求不到了, 在本来有广告的地方就变成空白
-> 能通过 dns 实现广告拦截的主要原因, 是因为 广告域名 和 主网站域名 不是同一个, 要分开进行 dns lookup

### dns 服务器的上下游
- 从 query response 的角度来说, 层级高的 dns server 就是 upstream server
- 像是这里 [stackoverflow - http upstream/downstream](https://stackoverflow.com/a/32365658) 所说的, "all messages flow from upstream to downstream"

[DNS sinkhole](https://en.wikipedia.org/wiki/DNS_sinkhole):
> The **higher** up the DNS resolution chain the sinkhole is, the **more requests will fail**, because of the greater number of lower nameservers that in turn serve a greater number of clients. Some of the larger botnets have been made unusable by [top-level domain](https://en.wikipedia.org/wiki/Top-level_domain "Top-level domain") sinkholes that span the entire Internet. 
- 层级越高的 dns server, 会被越多的层级低的 dns server 请求


## DoH DoT
- dns over https: 用 https 来发 dns query, port 443
	- dns query 就和其他 https traffic 混在一起了, 就很难被网络 monitoring 给发现了
- dns over TLS: 不用 udp, 用 tcp + TLS 来发 dns query, port 853
	- 企业可以监控 port 853 的流量, 可以把 853 的流量都拦截
- 用这两个都是通过 TLS 把 dns query 加密起来, 中间人就看不到 dns query 的内容 (不能通过 dns 知道客户端想要访问什么网站), 只能看到是个 dns query
- 但是客户端拿到 dns query 的结果之后, 还要再请求这个 ip address, 中间人还是能看到客户端想要访问什么网站
- 得 DoH DoT 和 proxy 啥的结合

## others
场景: 在一个 subnet (如企业环境) 里配置 dns server, 然后让这个 subnet 里的所有设备都使用这个 dns server
问题: 用户可能会在自己的机器上手动修改 dns server, 绕过企业的 dns server; 如何防止这种现象发生?
回答:
- 防火墙拦截: 只允许 dns 流量 (port 53) 发到指定机器, 不允许发往其他地址的 dns 请求
- dns transparent proxy: 把发往非指定机器的 port 53 的流量转发到指定机器
- NAT 重定向: 把发往 port 53 的请求在 router 这层通过 NAT 重定向到指定机器
- 强制使用 dhcp 配置: 强制用户使用 DHCP 获取 动态 ip 和 dns 地址, 防止用户手动配置 静态 ip 和 dns 地址
以上方法对 Dns over HTTPS 都有效吗?
- 前三个方法都是通过 port 53 来实现的, DoH 的本质是 https 请求, 端口是 443
- 强制 DHCP 配置也没用, 本身 强制 DHCP 是为了强制在子网设备上添加上 dns server 的配置; 但是 DoH 是发 https 请求, 直接无视设备上的 dns 配置



https://adguard-dns.io/en/public-dns.html
