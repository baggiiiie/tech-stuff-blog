# 是什么
[kubernetes official docs][https://kubernetes.io/zh-cn/docs/concepts/overview/components/]
- 管理容器的工具
- 用于容器的部署、管理、scaling、网络配置
-> Kubernetes 提供了一种高度抽象和灵活的资源管理方式, 使得 **物理硬件资源** 被视为可以 **被软件程序动态管理和使用的对象**

> [!note]
> Kubernetes 平台使用软件接口重新定义了什么是 CPU，什么是内存，什么是磁盘，什么是网卡，它直接接管了物理机的全部资源，以软件接口的形式对外暴露资源...   
> -> [高并发哲学](https://pphc.lvwenhan.com/part-two/infrastructure-concurrency/section-4)

# 基本概念
```md
+-------------------------------------------------------+
|                   Control Plane                       |
|   +--------------------+  +----------------------+    |
|   | API Server         |  | Controller Manager   |    |
|   +--------------------+  +----------------------+    |
|   +--------------------+  +----------------------+    |
|   | etcd               |  | Scheduler            |    |
|   +--------------------+  +----------------------+    |
+----------|------------------------|-------------------+
           |                        |
           |                        |
+----------v--------+           +---v--------------+
|   Worker Node     |           |    Worker Node   |
|   +-----------+   |           |  +-------------+ |
|   |  kubelet  |   |           |  |   kubelet   | |
|   +-----------+   |           |  +-------------+ |
|   |    Pod    |   |           |  |     Pod     | |
|   |   |- Cont.|   |           |  |    |- Cont. | | 
|   |   |- Cont.|   |           |  |    |- Cont. | |
|   +-----------+   |           |  +-------------+ |
+-------------------+           +------------------+
(Cont. for container)
```


节点 node:
- 运行容器的工作节点
- 也就是一台 **物理机器** 或 **虚拟机**

Pod:
- Kubernetes 里的 **基本部署单元**, 本质上是 集群上 **一组正在运行的容器**
- 一个 pod 可以包含 **一个或多个容器**
- pod 里的容器一起被部署、管理, **共享内存和网络等资源**
- pod 相当于是把 *有相关性*的容器 都放在一起了
	- 比如说需要相互通信的容器, 就可以放在一个 pod 里, 共享一个 network namespace, 通过 localhost (loopback address) 进行通信
	- pod 里的储存卷 (volumes) 也是共享的
- 每个 pod 都有 unique ip address
	- 一个 pod 里的 container 共享这个 pod 的 ip 地址 
	- 一个 pod 里的 container 共享这个 pod 被 network namespace 分配的 *port space*

service:
- a set of pods
- 因为 pods 具有动态性 (machine reboot, pod restart 等会导致 pod 的 ip 变化)
- service 作为 pods 上层的抽象, 统一管理 a set of pods
- service 有自己的 virtual ip (也叫 cluster ip)
	- 其他 service 通过这个 ip 进行通信, 所以即便 pods 的 ip 改变了也不会有影响
- 到一个 virtual ip 的的 traffic 会被 load balance 到不同的 pods

control panel:
- 负责管理和调度一个集群里的 pods
- 上面有个 etcd, 存储集群所有的 **配置信息** 和 **状态数据**

集群:
- 一个集群就是一些节点; 一些有相关性的节点放在一起就是一个集群
- 一个集群通常有个 control panel, 和若干个 worker node
- 每个 worker node 上有一个或多个 pods

api-server
> "In Kubernetes, everything is an API call served by the Kubernetes API server. The API server is a gateway to an etcd datastore that maintains the desired state of your application layer."  
> [source](https://sookocheff.com/post/kubernetes/understanding-kubernetes-networking-model/#11-kubernetes-api-server) 

kubelet
- 作为 daemon 在每个节点上运行, 管理该节点上的容器和 pods
	- 管理的内容包括: 资源, 健康, 状态 
- 和 api server 交互, 用户通过 api server 设置一个 desired state, kubelet 使得对应的 容器/pods 到这个 desired state

## etcd
[official docs](https://kubernetes.io/zh-cn/docs/concepts/architecture/#etcd)
是什么:
- 分布式的 key value 储存系统
- etcd 相当于 k8s 的 **后台数据库**, 用来储存集群的状. 和配置数据

## 卷 volumes (TBC)
- 简单来说, `卷` 在 Kubernetes 中指的是 **可以被 pod 里的容器访问的数据的目录**

## [Kubernetes networking](https://sookocheff.com/post/kubernetes/understanding-kubernetes-networking-model/)
几个原则:
- all Pods can communicate with all other Pods without using _network address translation_.
- all Nodes can communicate with all Pods without NAT.
- the IP that a Pod sees itself as is the same IP that others see it as.

### pod to pod communication
每个 pod 都有自己的 unique address, 不同 pod 之间的通信是怎么样的? 在同一台机器上的 inter-pod communication 和不同机器上的 inter-pod communication 分别是怎么样的?

同一台机器上:
- linux 有 [virtual ethernet device(veth)](https://man7.org/linux/man-pages/man4/veth.4.html), 能够让不同的 network namespace 之间通信
- ![[Pasted image 20250313105044.png|500]]
- 每个 pod 都以为自己有个 ethernet device
- 通过 veth, 这些 ethernet device 能够让每个 pod 和 机器上的 root namespace 通信
- root namespace 起到的作用是 packet forwarding, 有个 table, 根据 IP 地址 (然后有 ARP 那套, 发现MAC 地址) 进行转发

不同机器:
- packet 从 pod 到 root namespace 的时候, MAC 地址转发会失败, 因为 table 里没有对应的 MAC, ARP 也找不到
- 这时候就会被 root 的 ethernet device 发送出去
-> 感兴趣的是, 在不同的 node 之间是怎么样转发的

# 在干啥, 解决啥问题

## 多容器
- 现在的一个应用程序都被拆分成很多个微服务, 一个微服务又在多个容器里跑着
- 如何管理这些容器? 跨主机的情况如何管理这些容器的生命周期、网络配置? 
- kubernetes 就可以用来 创建、管理、调度 这些容器

## 应用的 scaling, 可拓展性
- 针对客户请求的高峰和低峰, k8s 也能根据**负载情况**和**资源消耗情况 (CPU)** 自动、动态地调整容器实例的个数

## 自愈能力
- 容器出现异常的时候, k8s 能够重启容器
- 部分容器异常的时候, 能够调度其他容器支持

## 服务发现和负载均衡
- k8s 给每个容器都分配一个 ip, 内置了服务发现, 能够让容器之间通信
- k8s 能均衡地把流量分配到不同的容器上

## 更新、回滚
- k8s 支持平滑地更新、 回滚
- 逐步替换旧容器实例, 换成新容器实例


# helm
-> a package manager for kubernetes
怎么样理解 “package”
-> package 就是 **包**, 在 helm 的 context 下, package 就是 **打包好的 Kubernetes 应用**
-> **helm chart** 就是这个 package 的模板

## helm 在干啥
例子, 比如说要在 kubernetes 上部署 nginx, 并不是一条 command 就可以把服务部署好的. 实际上需要考虑:
- 怎么配置 pod、deployment 来确保 high availability
- ingress
- 储存
- ...
helm 就是为了解决这些 kubernetes 所引入的复杂性:
- helm 把这一堆 kubernetes 的资源文件打包成一个 chart
- 统一通过模板来调整部署细节
- 统一部署、升级、回滚、删除

就像在 Ubuntu 上用 `apt install nginx`, 它会帮你把 NGINX 安装好并配置好. 在 Kubernetes 中, 用 `helm install nginx`, 它会帮你部署好 NGINX 和所有关联的 Kubernetes 资源。

