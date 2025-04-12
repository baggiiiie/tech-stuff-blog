# Linux abstraction
![[Pasted image 20241231170430.png|500]]
> ”On the operating system side, we have introduced three abstractions: files as an abstraction of I/O devices, virtual memory as an abstraction of program mem- ory, and processes as an abstraction of a running program. To these abstractions we add a new one: the virtual machine, providing an abstraction of the entire computer, including the operating system, the processor, and the programs.“  
> -> CSAPP

> “The operating system kernel serves as an intermediary between the applica- tion and the hardware. It provides three fundamental abstractions: (1) Files are abstractions for I/O devices. (2) Virtual memory is an abstraction for both main memory and disks. (3) Processes are abstractions for the processor, main memory, and I/O devices.“  
> -> CSAPP

-》 文件其实可以理解为 i/o 的 abstraction


# everything in linux is a file
- 所有资源和设备都是以 **文件的形式呈现的**, 都可以 **以文件的形式** 访问和管理
- represented as files
-> 表现在以下几点:
- 统一接口:
	- 不管是啥操作 (普通文件、目录、网络socket、硬件设备), 用户都可以用 open、read、write、close 这些 system call 来完成
- 通过 filesystem 管理:
	- 硬件
		- 硬盘、键盘这些硬件, 在 linux 的 file system 里, 是存在 `/dev` 这个目录下的 (像文件一样, 有目录; 硬件的交互都抽象成文件了)
	- 进程:
		- 进程也是在 file system 里有自己的目录 `/proc`
	- 网络:
		- socket 套接字 也是一样, 能在 file system 里找到一个 “文件”
	- 命令:
		- 用户执行的 `ls`、`cat` 这些, 也是储存在 `/bin` 的 可执行文件
	- 其他:
		- linux 自己系统本身的信息, 可以通过 `/sys` 来访问、管理
		- symbolic link、管道 这些都是一样, 有个 “文件” 的实例

-> 注意哈:
- 本身很多东西不是 ”文件“, 只是 linux 这个 **操作系统** 把他们抽象成了文件; 他们 **不是** 真是存在于 **磁盘** 上的东西, 他们存在于 **内存** 中
- 比如说 `/proc`、`/sys`, 这两个是 **操作系统内核动态生成的**, 他们本身 **不存在**, 只有用户请求的时候, 才会 **动态生成**
- 他们是 **逻辑上的文件**, 不是 **物理上的文件**

__实际上可以把和硬件的交互也理解成 *文件*__
![[Pasted image 20250227212417.png|500]] source CSAPP
- linux 和所有的硬件的交互, 也不过就是 I/O 罢了
- I/O -> 文件
- 可以说, linux 和 mouse/keyboard 的交互, 其实都抽象成 文件 了

# filesystem 文件系统
## 是什么
- filesystem 是 linux 的一个概念, 把 linux 中的所有数据都抽象成文件, 用树状结构来 organize; 通过 filesystem, linux 提供统一接口来管理这些数据

> the filesystem is a form of **database**; it supplies the structure to **transform** a simple **block device** into the sophisticated **hierarchy** of files and subdirectories that users can understand. -> how linux works

everything in linux is a file.
- 进程是 files, 存在 /proc 里
- 硬件设备是 files, 鼠标键盘啥的, 存在 /dev 里
	- `/dev/null` 里的 `dev` 是 device 的缩写
- socket 这些 I/O 也是文件
linux 把所有东西都抽象成文件过后, 提供统一的接口在对 任意东西 进行操作:
- read() open() 这些接口适用于 任意东西

### virtual / physical filesystems
**physical filesystem**
- 物理文件系统是 **真实存在于物理磁盘的** 文件系统, 负责数据实际的 **读取和写入**, **与硬盘直接交互**, 通过 inode 来管理数据
- 常见的 物理文件系统 有: 
	- ext 系列, ext2, 3, 4
> [!note]
> ext4等物理文件系统是Linux内核的一部分 (这些文件系统的代码都在Linux内核源码中), 而不是由使用的磁盘决定的!

**virtual filesystem**
- 每个 物理文件系统 的实现方式都不太一样, linux kernel 不需要知道这些差异
- 是基于物理系统的抽象层, **不存在与真实物理硬件上**, 只是一个 linux kernel 和物理文件系统 交互 的 **generic interface**
- 像是 /proc, /sys 这些 directory, 实际上不是真实存在于物理硬件上的, 而是由 **内核 动态生成** 的

![[Pasted image 20241103095358.png|500]]
- ext2, 3, 4 这些是具体的文件系统, i.e., 文件系统的具体实现
- virtual filesystem 是 linux 的 abstract layer
- ext2, 3, 4 这些不同的 文件系统 的实现上有差异, virtual filesystem 作为一个抽象层, 提供接口来统一和这些不同物理文件系统的交互, 屏蔽了不同物理文件系统的差异性
- 进程进行文件操作的时候: 
```
应用程序 -> VFS 接口 -> 具体的物理文件系统(如ext4) -> 物理存储设备
```


## 格式化一个磁盘
- 格式化 是对存储设备进行 **初始化** 的过程, 这个过程包括: 删除设备上的所有数据、分区(optional)、在磁盘或分区上创建一个新的 文件系统
- 当我们把一个磁盘 **格式化成 ext4** 时:
	- 内核中的 ext4 相关的代码在磁盘上创建了特定的数据结构
	- 这个数据结构使得操作系统能够处理文件和目录
	- 这个数据结构不是由磁盘决定的
- 磁盘只是一个存储设备, 只有最基本的读写功能, 不包含文件系统的逻辑
- 文件系统本身不是个 **物理结构**, 是个 **逻辑结构**; 通过格式化磁盘, 在磁盘上创建特定的数据结构, 能够让磁盘上的数据块具备 **逻辑**(文件、目录等)

-> 格式化磁盘为ext4的时候, linux 把 ext4相关的数据结构存储到磁盘里, linux就可以根据这些数据结构, 把磁盘上本来没有逻辑的数据块解读为 文件、目录等逻辑结构
> [!note]
> 文件系统的核心工作就是将 **无序的数据块** 组织成 **有意义的层级结构**

## mounting 挂载
mounting 在干啥:
- 把 **物理设备** 连接到 **os 的目录树**, 使这个设备称为 os 文件系统的一部分

### 接入硬盘
一个硬盘接入 linux 设备时:
- linux 内核识别到新设备, 并在 `/dev` 下创建一个新目录, 如 `/dev/sdb`
- 对于硬盘上的每个分区, linux 会检测分区的 文件系统类型 (ext4、3等)
- 系统把分区挂载到目录树上


## device
- credit - how linux works
![[Pasted image 20241224163829.png]]
- how linux works 里有讲但先不学 block 和 character 是啥; 这里是想指出 pipe 和 socket 属于 `device`


## swap partition & swap file
- 用磁盘来 augment 内存的一种方式

swap partition 交换分区:
- linux 在磁盘上划分出一部分区域, 作为 swap partition

swap file:
- swap file 本质上是 **硬盘** 上的一个文件, 用来临时存储内存中不常用的数据
- 比 swap partition 更灵活, 可以随时创建、删除、调整大小

## logical volume manager (TBC)

## inode
- https://www.reddit.com/r/linuxquestions/comments/1744wa2/comment/k475se4/
- https://www.reddit.com/r/linuxquestions/comments/1744wa2/comment/k4762li/ 
### inode 是什么
- index node: **索引** 节点, 是 unix 类 OS 里的一个 **数据结构**, 用于描述 **文件系统** 的 **对象** (objects of filesystem), 如文件、**目录** (目录也有 inode). 
	- 文件和 inode 是一对多的关系; 硬链接: 多个文件可以指向一个 inode
- inode 包含了这些 **抽象文件** 的 **元数据**, 使 **操作系统** 能够有效地管理文件
- -> everything in linux is a file. linux 是怎么访问、管理这些 files 的呢? inode

inode 储存的信息:
- 文件的字节数 
- 文件的 **用户id UID** 和 **用户组id GID**
- 文件的权限
- 文件相关的时间戳: 创建时间 ctime、修改时间 mtime、访问时间 atime
- 文件的 **硬链接数** (指向该 inode 的 **文件名数量**) (操作系统允许多个文件名指向一个 inode)
- 文件上的数据 **在物理磁盘上的位置**

> The inode is a data structure in Unix/Linux filesystems that stores all the metadata about a file except its name and actual data.  
> The inode is essentially the filesystem's *database record* for a particular file, containing all its attributes and pointing to the actual data blocks that contain the file's contents.
> -> claude
- inode 不存储 filename (filename 是硬链接存储的)

实际上, 执行 `ls -al file` 的时候获取到的信息, 就是从 inode 来的: 
```
╰─❯ ls -alh .git  
Permissions Size User Date Modified Name
.rw-r--r--@   60 ydai 13 Feb 15:41  .git
```



操作系统访问文件:
- 操作系统通过文件名找到 inode 号码
- 获取 inode 信息
- 根据 inode 上的信息, 找到文件数据在磁盘上位置, 读取内容

注意:
- inode 本身也是数据, 也会占用 **磁盘空间**
- inode 是会被用完的
- disk 还没满, inode 用完了, 也是不能创建文件的
- 在创建文件、目录、软连接的时候会创建新的 inode, 但是创建硬链接的时候不会创建新的 inode

> [!note]
> 不只是磁盘上的文件, socket、pipe、symlink 这些也是有 inode 的.  
> 进程本身没有 inode, 但是进程相关的 **文件对象**, 比如说 `/proc` 文件系统中的进程目录 `/proc/123` 就是有 inode 的   
> 

credit - how linux works![[Pasted image 20241228231508.png|300]]
## 软硬链接
[[linux cmds#soft link (symbolic link)]]
### 软链接
- **快捷方式**, 指向 **源文件的文件路径**
	- 注意: 软链接指向的文件如果重命名了, 那链接就断了; 原来的软链接就指向一个 **不存在的文件路径** 了
	- 编辑一个 softlink, 实际上就是被 redirect 到了源文件去编辑
- 创建软链接, 会创造 **新的 inode** 
- 源文件被删除, 软链接 **不会被删除**
- 软连接可以指向 **目录**
- 支持横跨 **文件系统 filesystem**, 
	- 反正只是个 pointer 嘛, pointer 只是指向源文件的 **文件路径**, 所以放哪儿都行

### 硬链接
- 同一个 **数据块** 的不同入口, 实际上是同一个文件的 **不同文件名**
- 硬链接共享同一个 **inode**, 创造硬链接不会增加 inode
- 一个数据块的所有 硬链接 都被删除了, 数据块的 inode 才会被删除
- 硬链接指向 磁盘里的 **数据块**
- 不能横跨 filesystem, 
	- 简单来说, 两个 filesystem 对应两个不同的硬件, 而硬链接指向的是硬件上的数据块, 数据块不能跨硬件来指, 所以硬链接不能跨 filesystem
	- inode 在不同的文件系统中是 **独立的**, 不同文件系统里的硬链接不能共享 inode
- 硬链接的权限和源文件的权限保持一致, 改变其中一个会改变所有 (其实改变的是 inode)
 ![[Pasted image 20241126121140.png|500]]
 - 一直用的都是软链接, 都不知道要怎么创造硬链接, 其实就是没有 `-s`: `ln /path/to/file path/to/hardlink`

### 为什么需要软硬链接
软链接:
- 能指向目录, 能指向不存在的路径 (预留路径)
- 能跨 filesystem, 能提供快捷方式, 提供灵活性和便利性
硬链接:
- 相当于 **实时备份**, 防止误删, 确保数据安全
- 共享数据块 (共享文件内容)
	- 如果使用软链接的话, 源文件一改名, 所有的软链接就都断了
	
### 从 inode 的角度来理解 文件的硬链接
![[Pasted image 20241117150237.png | 500]]
从 **inode** 的角度来理解 **硬链接数量**: 指向同一个 inode 的文件名的数量
- 在 `simplefile` 被创造的时候, 硬链接的数量是 `1`
	- 这个文件名 **指向的 inode** 一共有 1 个 硬链接
- 在创造了 `hardlink_to_simplefile` 之后调用 `ls -l`, 两个文件上展示的 **硬链接数** 都是 `2`
	- 意味着: 这两个文件指向的 inode 有两个硬链接
- 从 inode 的角度来看, 这两个硬链接是 **等价** 的, 没有什么分别

### 目录的硬链接
- 每个目录本身就有 **2 个硬链接, 分别是 `.` 和 `..`**, 指向自己和父目录
	- 根目录的 `..` 指向自己, 在根目录 `cd ..` 还是在根目录
- 在一个目录 `dir` 下创建新的 **子目录 subdir** 的时候, `subdir` 有 `..`, 指向 `dir`
	- 所以在 dir 下新建子目录, 每个新的子目录都会让 dir 的硬链接数 +1
	- 在 dir 下新建文件, 文件不会让 dir 的硬链接数增加哈, 文件没有 `..`
	- subdir 下新建目录 subsubdir, 也不会让 dir 的硬链接数目增加
![[Pasted image 20241117153750.png|500]]

### 其他
- linux 找出循环的软链接: `find /path/to/search -type l -exec test ! -e {} \; -print`

### todo
- 从 inode 的角度上看, 文件和目录有什么不同?
- 为什么需要软硬链接?
- 软连接的 inode 是怎么样的?


# file descriptor
文件描述符
## 是什么、干什么
- file descriptor 是个非负整数, 本质是个 **index 索引值**; 
- 每个进程都有个 file descriptor table, 用来记录自己打开过的 *文件 (抽象的文件哈)*
- file descriptor 就是这个表里的一个 index
作用:
- 用来记录一个进程已经 **打开过的文件**、**管道**、**网络连接** 等 **I/O** 资源
- 从0开始递增, 绝大多数情况下:
	- stdin - 0
	- stdout - 1
	- stderr - 2
- 虽然叫 **文件描述符**, 但是所有 **I/O操作** 相关的资源都可以用 FD 来访问; 本身是一种抽象机制;
- FD 会被耗尽, 每个进程的 FD 是有限的

管道和网络连接属于 I/O 资源?
- yeaboi
> [!note]
> 进程是如何指向文件的? 整个流程是这样的:  
> 文件描述符 (进程纬度表) → 文件表 (系统全局, 内核维护) → Virtual Filesystem inode 表    

说 “关闭文件描述符”, 是在关闭个啥?
- 关闭文件描述符实际上就是使用 `close(fd)` 系统调用, 将这个 fd 对应的文件或资源释放

# system call

## 什么是 system call
- system calls 是 操作系统 **内核** 提供的一组 **接口**, 让 **user mode** 的 program 能够请求内核执行某些 **权限更高** 的操作. 
- user mode 和 kernel mode 的桥梁. 

## system call 执行的操作
- 进程控制
	- 创建、执行、终止、等待进程
- 文件操作
	- read、write、open、close
- 目录操作
	- mkdir、link、unlink (创建, 删除硬链接)
- 保护
	- chmod 改变执行权限 chown 改变 ownership
- 进程之间的通信
	- pipe 管道、shmget 共享内存操作
- 网络操作
	- socket、bind、connect
	- send、recv 发送和接受数据

## process 如何发起 system call
流程
- program running
- ask linux to do stuff for them by calling "system calls"
- **switch to kernel mode** and execute the "system calls"
- **switch back to user mode** to continue the program
->
- 每个 system call 都有自己的一个编号 (对于程序来说, process 不感知到这个system call 的编号, 而是直接调用 syscall 的名字)
- program 通过特定的指令触发 **用户态** 到 **内核态** 的切换
- program 把system call的编号和参数通过 **寄存器** 或 **栈(还不确定是否有栈)** 传递到 **内核**
- **内核** 执行对应的system call, 切换回 **用户**

## go deep 系统调用的流程
- 用户空间的准备 (userland)
	- 用户程序准备好需要传递给内核的参数，包括 **系统调用号** 和 **其他必要参数**（如文件描述符、缓冲区地址等）。在x86-64架构中，系统调用号通常放在 `RAX` 寄存器中，参数则放在其他寄存器中
- 执行系统调用指令
	- 用户程序执行特定的指令（如 `syscall`），这条指令用于触发从用户态到内核态的切换。(int 0x80 也是一种方式, 是触发了 **中断** 来实现的, 已经是 legacy way; `syscall` 不是中断)
- CPU 切换到内核态
	- **CPU** 从用户态（ring 3）切换到内核态（ring 0）。在这个过程中，CPU会保存当前的上下文信息，包括程序计数器和状态寄存器，然后跳转到预定义的系统调用入口点 (这个入口是个啥?)
- 内核执行系统调用
	- 内核根据系统调用号查找对应的处理函数，并执行该函数。这个函数将会执行实际的操作，比如读取文件、创建进程或进行网络通信等。完成后，结果会被存放在`RAX` 寄存器中，以便返回给用户程序
- 返回用户空间
	- 一旦内核函数执行完毕，CPU会通过执行 `sysret` 指令返回到用户空间。这条指令会恢复之前保存的上下文信息，使得用户程序能够继续执行

## 为什么要系统调用
- **安全性**：系统调用提供了一种安全机制，防止用户程序直接访问硬件资源，从而保护系统稳定性和安全性。
- **标准化接口**：通过系统调用，应用程序可以使用统一的接口与操作系统交互，而不需要关心底层硬件实现细节。
- **资源管理**：操作系统通过系统调用来管理资源使用，确保多个应用程序能够安全有效地共享硬件资源

# IPC - pipes
## 是什么、干什么
管道, 是 进程间通信 InterProcess Communication 的一种机制. 
是一种 **特殊的文件类型**, 本质是 **内核** 维护的一个 **缓冲区**
1. 在 **内核** 中维护 **缓冲区 (buffer)**, 这个缓冲区连接两个进程
2. 这两个进程以 **生产者 - 消费者** 的模式通信, 一个进程把 output 写到管道里, 另一个进程消费管道的内容作为 input
3. 管道是 **单向** 的, 读端只读, 写端只写
> [!note]
> pipe 的本质是 **内存缓冲区**, 因为 everything in linux is a file, 所以 pipe 可以通过 file descriptor 访问      
> 但是 pipe 不是基于文件实现的
> - 缓冲区 是 **内存** 里的 **临时存储区域**

## 管道是个 byte stream
- 本身没有 **message boundary** 的概念, 可以在 application 实现.
- 如果需要 application 实现的话, 就不如直接用另一种 IPC - message queue 了

## 工作原理
比如在 shell 里执行 `cmd1 | cmd2`, 发生了什么?
- 创建管道: shell 调用 `pipe()` 创建管道, 调用 pipe() 会返回 **2 个文件描述符**, 一个是读一个是写 
	-> 这个是从 the linux programming interface 里摘抄的
- 创建进程: shell 会调用 `fork()` 创建 `cmd1、cmd2` 两个子进程, 并且把 cmd1 的输出 **重定向** 到管道的写端, 把 管道的读端 重定向到 cmd2 的 stdin 
- 数据流动: cmd1 向管道写入的时候, 数据会写到 **内核** 的 **缓冲区** 里, 直到被 cmd2 消费; 如果 cmd2 消费的时候没有数据, 则会被堵塞
- 清理: 命令执行完毕后, shell 作为父进程, 会收集子进程的退出状态, 关闭文件描述符, 回收资源
![[Pasted image 20241118095734.png|600]]
- 看上面这张图, 
	- 父进程创建 pipe, 产生两个 fd
	- 父进程 `fork()` 创建子进程, 子进程也有这两个 fd
	- 父进程 **显示地关闭一个 fd**, 子进程也 **显示地关闭另一个 fd**


## 两个进程同时读管道
> One reason that it is not usual to have both the parent and child reading from a single pipe is that if two processes try to simultaneously read from a pipe, we can’t be sure which process will be the first to succeed—the two processes race for data. Preventing such races would require the use of some synchronization mechanism.  
> -> the linux programming interface

用管道实现双向通信 bidirectional communication:
- 用两个 pipe, 两个 unidirectional
会出现什么问题:
- 如果两个进程都在 **读取空的 pipe**, 或者都在 **写入满的 pipe**, 那两个进程就一起堵塞了
-》 deadlock 死锁: 多个进程相互等待导致相互阻塞

## pipe allow comm between related processes
![[Pasted image 20241118105638.png|500]]
在上面这段代码中:
- pipe 在 **子进程被创建之前** 就被 **创建** 了, 调用 `pipe()` 返回两个 FD
- 所以在 `fork()` 创建子进程的时候, 子进程和父进程一起共享 FD
	- 除非子进程显示地 **关闭 FD** [[CPU, memory, processes, and threads#子进程执行 exec()]]
- 同样地, 如果在子进程里继续调用 `fork()`, 那进程可以和 grandchildren 通过 pipe 通信
- 同样的, pipe 也可以用来在 sibling process 之间通信
	- shell 执行 `cmd1 | cmd2` 的时候就是, cmd1 和 cmd2 是两个 sibling processes
	- shell 先创建个 pipe, 然后 `fork()` 两个 子进程, 两个子进程就共享这个 pipe 的 FD 了, 通信就是这么实现的

## 没有亲缘关系的进程也可以通过 匿名管道 沟通
只要能把 **管道的 FD** 传给其他进程, 比如说:
- 把管道的 FD 通过 **unix domain socket** 传给另一个进程

## 类型
匿名管道 unnamed pipes:
- 父子进程之间的通信
- 数据流单向
命名管道 named pipes (FIFO): 
- 没有亲缘关系的管道之间通信, 可以让任何进程之间通信, 
- 数据流单向
- 基于文件, `mkfifo pipe_name` 创建一个命名管道 
- 不同的进程可以往这同一个管道里写 
## 匿名管道
- 生命周期和创建管道的进程一样, 进程退出后管道消失
- 通常用于有亲缘关系的进程之间沟通, 如 **父子进程的沟通**, **sibling 进程**
- 一般是单个读方, 单个写方

## 命名管道 FIFO
- 基于文件, 在 filesystem 里属于一种 **特殊的文件形式**
- 永久存在, 直到文件被显式删除
- 不同的进程可以往同一个管道里写, 甚至可以跨网络
- 可以有多个读写方
- `echo "HI" > pipe_name &` 会返回进程 id

- ==这个 **&** 是干啥的??==, 学一下 linux shell 命令的最后这个字符吧, 比如 +, /, &
	- [[linux cmds#基本符号概念]]
	- `sleep 10 &` 是把 `sleep 10` 这个命令放到后台去跑了
	- `jobs` 能看到现在在跑的进程
	- 调用 `fg %1` 会把在后台的第一个进程放到前台
	
## 管道阻塞:
- 写入阻塞:
	- 管道满了 (缓冲区满了)
	- 没有进程在读取管道 (写入管道过后进程就可以继续, 不需要等到自己写入的数据被读取)

- 读取阻塞:
	- 进程读取管道的时候, 没有数据, 进程会被阻塞, 直到管道有数据为止


# IPC - signals
## 什么是信号
- 信号是linux里 **进程间 异步 通信** 的机制 (一种IPC机制)
- 信号来源于 events, events 可以是
	- OS本身, 如进程在访问无效的内存, OS就会给进程发信号
	- 其他进程
	- 用户操作, 比如 control-c
	- 硬件的问题, 比如设备断开连接
		- control c 和其他硬件相关的, 会先触发一个 **中断**, 再由 内核 给进程发送 **信号**

进程之间相互发信号, 一个进程不能直接发给另一个进程, 要通过调用 system call 来完成
==signals are sent from **linux kernel** to **process**==
> [!note]
> signal 有时被叫做 **software interrupts**, 软件中断    
>  signals are sometimes described as *software interrupts*.
>  -> the linux programming interface  

## 对比下 pipe
和 pipe 不同, 信号不基于文件
首先, 信号是 **指定方向的**
- 在进程A给进程B发信号的时候, 需要知道进程B的 **PID**
- 信号相当于是 **端到端** 的, 管道是 **生产者 - 消费者** 的模式
其次, 信号是 **异步** 的
- 发信号方 发了信号过后就 move on 了, 不会管信号发到了没
- 但是 pipe 会有 **阻塞**, 如果 pipe 满了, 或者没人在 **读** pipe, 那进程写不进去 pipe 就堵塞了
信号的 **一对多**
- 信号不能直接把同一个信号 **广播(同时发送)** 给 **多个进程**
- 但是能够把 **相同的信号** 发送多次给 **不同的进程**
信号 只是用来 **发信号** 的
- 信号能发的信息量很小, 就是个信号, 且是 message based 的
- 而 pipe 相对来说能发的信息量很大, 是 **字节流** 式的

## 进程是怎么处理信号的
- programs can set custom handlers to almost any signals
	- except **sigstop** and **sigkill** can't be ignored
- 进程对于一个信号可选的操作:
	- 忽略 (除了上面写的 sigstop 和 sigkill 不能被忽略)
	- 捕捉信号并执行自定义的操作
	- 执行该信号对应的默认操作, 默认操作包括:
		- ignore、kill process、stop process、resume process、kill process and *make core dump file*
- 在多线程程序中，信号处理变得更加复杂。通常，信号会被发送到整个进程，而不是特定线程。

## 进程 a 发信号给进程 b, 发生了什么
1. 进程A调用 **sys call**
2. 内核收到 sys call, **校验** A 是否有权限发信号给B (通常需要进程之间是同样的用户)
3. 内核校验过后, 把 A 发送的信号添加到 B 的 **信号队列** 里
	- 这个 **添加** 可以展开学学
	- 标准信号是不会重复的, A 如果发了多个 sigterm, 内核只会添加一次
4. B 重新回到执行状态的时候, 内核会检查 B 的信号队列
5. 如果 B 有 signal handler, 那 **内核** 会调用 B 的 signal handler
6. 如果 B 没有 handler, 那 **内核** 会调用 default action
7. 信号处理完毕之后, B 恢复原来的执行流


## 信号是异步的吗? 
是的, 信号是 **异步** 的
- 信号可能在任何时候发生, 进程B可能在干自己的事, 比如 I/O, 计算等; 只要信号到了, 就会 **立即** 被处理
- 进程 A 给进程 B 发的信号, 要等到 进程 B 在占用 CPU 时间的时候才会被处理
- 信号的发送不依赖于接收方的状态 (不需要B有等待、监听等动作)
- 信号是内核在后台异步管理的

## 用户按下 control c 发生了什么
- 键盘产生对应的 电信号, 键盘上的主板啥的把这个电信号转化成数字信号
- 键盘上的某个控制器会给 **CPU** 发一个 **硬件中断 IRQ** (Interrupt Request)
- CPU 收到 中断 之后, 会停止当前的程序, 切换到 ring 0, 执行 **中断处理程序 interrupt handler**
- 内核处理 control c 这个组合键, 发送一个 SIGINT 的 **信号** 给 terminal
- terminal 处理这个信号; 这个信号不是 SIGKILL 啥的, terminal 可以选择忽略


## 信号有 queue 吗 (TBC)
标准信号:
- **无累积**：标准信号的队列只存储每种类型信号的一个标记位，表示该信号是否已经被发送过。即便同样的信号多次发送，它在信号队列中也只会保留一次。
- **处理顺序**：内核处理信号时，会根据信号的优先级依次处理。标准信号优先级由信号编号决定，信号编号越小优先级越高（例如 SIGKILL 的编号为 9，优先级较高）。
- Linux 系统对实时信号的队列大小有一定限制，超过队列大小时，额外的信号可能会丢失.
还有 realtime signals:


# 重定向 >
## 是什么、干什么
==\ > 和管道符 | 都是将命令的输出重定向，但它们的作用不同：| 是将输出传递给另一个命令，而 > 是将输出保存到文件。== 
重定向是这个 `>`, 把一个进程的 stdout 或 stderr 写到文件里
- `ls > log` 相当于 `ls 1>log`, 把 stdout (FD 1) 写到log里, 覆盖 log 里的内容
- `ls 2> log` 把 stderr (FD 2) 写到 log, 覆盖 log 里的内容
- `ls >> log` 写到log, 追加到 log 的末尾, 不覆盖原有内容

同时重定向 stdout 和 stderr
- `command > output.txt 2>&1`
- `2>&1`: 把 stderr 重定向到 stdout
- FD 是 pointer, 2>&1 的意思是把 stderr 的位置也指向 stdout

## cat file 和 cat < file
- cat file 是把 file 作为 cat 的一个参数, cat 去读取 file 的内容, cat 感知到 file
- cat < file 是用了 **重定向**, 把 file 里的内容重定向到 cat 作为 cat 的 stdin, **cat 对 file 不感知** (cat 只是在读 stdin)
- 两者表现一致, 但实际实现原理不同


# IPC - sockets 套接字
## 是什么、干什么
socket是一种 IPC 的机制, 允许 **同一台** 计算机或 ==**不同计算机**== 上的不同进程进行沟通, 主要是 **网络通信**.
-> TCP/IP 的核心, 可以工作在 多种协议上, TCP、UDP都可以
-> socket 是网络端点的抽象
-> socket 提供 **网络通信** 在 linux 上的 **文件抽象** (调用 socket 返回文件描述符)
- linux 提供了一套接口来操作 socket, 如 recv(), send(), listen(), bind() 等


## socket 可以看作是 **网络通信** 的 抽象文件
- 创建socket: 是开了一个网络通信的端点, 这个端点没有和 IP port 这些绑定, 返回一个 FD
- 绑定 ip port 和 socket: 调用 bind() 来把 socket 和 IP:port 绑定
- 一个 socket 对应一个 FD, FD 用来识别 socket
- 然后就可以根据这个 FD 来进行 I/O 操作, 
- socket 的 I/O 操作就是接收数据和发送数据
- 对于 TCP socket, 还需要 listen(), 客户端需要 connect(), 服务端需要 accept()
-> 一种抽象, 把网络通信变得像 文件 I/O 一样简单

也可以通过 socket 实现同一台计算机上进程之间的沟通. 
-> unix domain socket

> [!note]
> sockets 是 linux 网络通信中, 从 user space 到 kernel space 的桥梁。 
> sockets bridge the gap between the kernel’s transport layer and the user-space application layer.  
>  -> how linux works


## 都在一台电脑上, 为啥要有 source IP? 直接用 port 不就足以区分了吗?
- port 是用来区分进程的, 如果这台主机只有一个 ip, 那所有的 socket 对应的 source ip 都是一样的
但是:
- 一台电脑可以有多个网卡, 那就会有多个 source ip

## unix domain socket
虽然在本地通信, 但也支持 流式(SOCK_STREAM) 和 数据报式(SOCK_DGRAM) 通信
这样创建一个 unix domain socket
```c
    int server_fd, client_fd;
    // 创建套接字
    server_fd = socket(AF_UNIX, SOCK_STREAM, 0);
```

> [!note]
> “... a Unix domain socket is not a network socket, and there’s no network behind one. You don’t even need networking to be configured to use one. Unix domain sockets don’t have to be bound to socket files, either. A process can create an unnamed Unix domain socket and share the address with another process.”  
 -> how linux works



## 多个进程监听一个端口
多个进程监听一个端口的话, 内核会根据一定的调度原则来分配给进程, 比如 round robin 之类的

那所有的 http 请求都发到 80, 所有的 https 都到 443, 这个是怎么处理的?
比如说, 一个 server 上有两个 services, 分别处理不同的 http 请求, server 的内核怎么知道哪个数据发到哪里呢? 
- 在这个场景, server 的 内核 就不干调度的这个事了, 这时候需要部署个 nginx 啥的来实现
- nginx 或其他主进程 监听 80 / 443 端口, 再根据请求头里的 host, 比如 `host: service1.example.com` 来分配; 或者是 url 啥的, 给他 load balance 下
- 对应的 service1 进程可能监听的是 `8001` 这个端口, 那 nginx 就把对应的 http 请求转发到这个端口
- service1 处理完请求之后, 响应的时候还是从 8001 这个端口发给主进程, 主进程从 8001 这个端口接收, 从 80 端口发给客户端 (主进程的socket上绑定了客户端的 IP:Port)

## AF_INET
### 是什么
- short for ==**Address Family Internet**==, 也有地方叫 PF_INET (Protocol Family Internet), 两个是同样的. 
- AF_INET 本身是个 **==常量==**, 在系统中 *<sys/socket.h>* 里是这样定义的: 
	```C
	#define AF_INET 2
	```
- 这个数字表示了 AF_INET 在系统里的标识符

类型:
- AF_INET 用的是 IPv4,
- IPv6 对应的是 AF_INET6,
- 本地的通信是 AF_LOCAL 或 AF_UNIX

### 作用
在创建 socket 的时候选用 **地址协议**
```c
int socketfd = socket(AF_INET, SOCK_STREAM, 0)
```
以上创建了个 IPv4 的 流式 socket (流式socket通常就是 TCP 了)

## web server 与 socket
![[Pasted image 20250227094600.png|600]]source how linux works
- 一个主进程监听 incoming connection
- 有 incoming connection 的时候, 主进程 accept, 并创造子进程来执行 incoming connection 需要的业务逻辑
- 整个过程涉及到两种 sockets
	- 一个是 主进程的 socket, 只用于 listen
	- 另一个是 主进程 accept() 时创造的 socket, FD 传到子进程里, 用于 read write






# file buffering 
程序在调用 **write()** 这个 system call 的时候, 数据不一定会马上被写到磁盘或其他物理设备的, 可能会 buffer 一会儿, 为了 save on system calls
- 有的进程频繁 I/O, 操作系统就把这些 I/O 数据都收集到 buffer 里, 再一起写到物理设备上

**full buffering 全缓冲**
- files 和 pipes 的默认缓冲形式 (回顾: pipes 的缓冲区)
- 以 chunks 的形式进行缓冲, 缓冲区满了之后才会写到输出
- 例子: 进程把数据写到文件里

**line buffering 行缓冲**
- 按照行进行缓冲, 遇到换行符的时候写到磁盘 (或缓冲区满了的时候)
- 例子: terminal
```python
import time

# 默认情况下，终端输出是行缓冲
print("This is line buffered", end='')   # 不加换行符，暂时不会输出
time.sleep(5)   # 等待2秒
print() 
time.sleep(5)   # 等待2秒
print("... now it prints because of the newline.")   # 有换行符，立即输出
time.sleep(5)   # 等待2秒
print("This line uses flush", end='', flush=True)
```
上面这行代码, 第一个 print 没有结尾的**换行符**, 要等 5s 后, 第二个print打出了换行符才会print
最后一个pirnt也没有结尾的换行符, 但是有flush, 也能直接print


**none 无缓冲**
- 有啥就直接写了
- default for stderr
- 例子: 日志文件, stderr 需要马上就写到日志文件里, 先写到内存里, 如果程序异常退出的话可能就丢了
```python
import sys
import time

# 输出到标准输出 stdout (行缓冲)
print("This is stdout", end='')

# 输出到标准错误 stderr (不缓冲)
print("This is stderr", file=sys.stderr)

time.sleep(2)   # 等待2秒

# stdout 直到换行符时才输出
print(" after 2 seconds stdout flushed")
```
>[!note]
>上面这一段代码的输出: ==用户会先看到 stderr 的print==, 因为 stderr 没有缓冲, 直接就打印出来了
>而第一个print要等到第三个print的换行符之后才会一起被print出来


**flushing**
忽视缓冲, 直接写

# memory 内存
## 虚拟内存和物理内存
- linux 内核把 **物理内存** 分成 **页面**, 每个页面是 **4kb** (为什么是 4kb? 是由硬件架构啥的决定的, 和 CPU 的位数没有直接关系)
- 页表里的每个 entry 是 把每个进程对应的 **虚拟内存** 和 **物理内存** 映射起来
- 这个 **页表** 实际上就是个index表 (页表里会指向磁盘吗? **不会**)
- 页面里每个 entry 是 4 byte 
	- 32 位CPU, 内存地址是32位, 一个 entry 存一个地址, 一个 entry 是 32位, 即 4 byte
	- 这个页表的的 entry 是 内存的 **地址**, 这个 4 byte 是地址的大小, 不是地址指向的内存的大小; 内存的大小是 1 字节

### MMU 和 page fault
- CPU 上的 memory management unit MMU 是来管理这个页表的
- 如果 MMU 发现一个进程的 虚拟内存 对应的 物理内存 的 **有效位** 为 0, 就会发出 page fault ([page fault 不是 interrupt, 是 exception](https://stackoverflow.com/questions/43458341/difference-between-an-interrupt-and-a-page-fault))
- **操作系统** 会根据这个 page fault 把不常用的内存释放出来 
- **malloc** 实际上就是个 用户态进程 和 内核 申请 **虚拟地址** 的过程, 调用 malloc 时还不会分配物理内存; 调用 malloc 会建立页表映射，但实际的物理内存是在首次访问时才分配的
- 内存是按需分配的 demand paging; 当进程真正访问这段内存时，才会触发缺页中断，导致分配实际的物理内存页

### 虚拟内存有什么用
1. 虚拟内存可以远远 **大于物理内存** (最大上限由 CPU 位数决定 [[CPU, memory, processes, and threads#CPU 位数]])
2. 代码执行的时候, 对于内存的访问有很大的 **重复性** (经常是同样的那一块内存被访问), 虚拟内存可以减少程序对 **物理内存的需要**; 
	- 比如说, 程序还没用到的内存就先不做映射, 程序用完的内存先释放
3. 每个进程都有自己的虚拟内存, 自己的内存页表, 不会和其他进程冲突, 相互独立; 统一由内核来解决内存地址冲突的问题
4. 页表里除了内存地址以外, 还有 **标记属性** 的 bit, 比如说在 copy-on-write 的时候, 标记一个内存是 **只读**


内存冲突:
![[Pasted image 20241114181557.png|500]]

### 最大虚拟内存
[[CPU, memory, processes, and threads#CPU 位数]] 中有计算


## 内存分段 segmentation
![[Pasted image 20241113231007.png|500]]
![[Pasted image 20241114122229.png|500]]

- 从逻辑的角度分割 **连续** 的物理内存给进程
- 内存分段都是连续的, 段的大小根据 **实际需要** 来分配
- 会出现 **内存碎片** 的情况 (**外部碎片**)
- 上图的情况, 要解决那两个 128MB 的碎片内存, 就需要 **内存交换**
	- 也就是把物理内存的数据 **写到磁盘**, 再 **重新写回内存**
	- 在重写的时候, 把碎片都填上
- 因为分段都是连续的, 所以这个 **内存交换** 的过程, 要把游戏的 512mb 都写到磁盘再写回内存, 所以 **开销很大!**


### 内存分段的两个缺点
- 会产生 **外部内存碎片**
- 内存交换的开销很大


## 内存分页 paging
### 页表为进程纬度的
- 每个进程都有自己的虚拟内存空间, 所以每个进程都有自己的页表
- 页表是进程级别的, 每个进程有自己的页表 (**OS** 为每个进程维护一个页表, 是OS维护, 不是 CPU); 
	- 因此在切换进程的时候, 也是要切换页表的, 这也是 context switching 开销的一部分

### 页表 ==**不储存**== 磁盘地址, 页表是内存管理的机制
- 页表上存的只是 **物理内存的地址**, 不会存 **文件描述符** 和 **文件偏移量**; **文件描述符** 是 **系统层面 I/O操作** 的概念, 不是页表的概念
	- 不懂之前学了个啥, 为啥这里要提到文件描述符 lol 😅
![[Pasted image 20241013174801.png|500]]
> [! GPT]
 > - 页表条目中的地址字段始终指向 **物理内存中的页框**。即使页面被换出到 **磁盘** 上，页表条目仍然不会直接存储磁盘的地址。  
> - 当数据从内存上换到 **磁盘** 上之后, 页表的 entry 上不会再记录 **内存的地址**, 而会变成 **无效** 等 (如下图)    
> - 操作系统通过其他机制（比如交换空间管理）来跟踪哪些页面被换出到了磁盘，并在需要时将它们从磁盘加载回内存。

![[Pasted image 20241014174258.png|300]]

### 页表会出现浪费的情况
- 每个页表的 entry 都是 4kb 的, 如果进程实际上不需要 4kb 这么多, 那也只能按照 4kb 来分配

### 多级页表 
#### 情景
- 假设一个进程的虚拟内存有 4G, 实际只使用了 16K
- linux 的每个分页是 4K, 那这个进程需要 4G / 4K = 1M 个分页; 
- 储存每个分页需要 4 bytes, 那 1M 个分页就要 4M 内存 (分页储存在内存上?)
- 这样的进程又有很多个, 那分页对内存的占用量就太大了

#### 多级页表:
- 32 位的CPU, 虚拟地址的长度是 32位 的
- 前10位被分成 **一级页号** 的地址, 中间10位是 **二级页号**, 最后12位是 **页内偏移**
- 也就是说, 一级页表 和 二级页表 分别各占 10位, 这两张表分别就需要 **2^10** 个 entry -> 1024

#### 针对上面的情景, 如果用了 **二级页表**:
- 一级页表占 10 位, 所以需要 2^10 个 entry (1024个entry), 一个 entry 是 4 bytes, 一级页表一共占用 `4bytes * 1k = 4kb` 内存
- 一级页表的 entry 指向 二级页表, 一级页表有 1024 个entry, 则 二级页表 有 1024个; 每个二级页表又有 1024 个 entry, 总共的页表大小等于 2^10 + 2^10 * 2^10 = 2^10 + 2^20 = 4kb + 4mb, 反而比原来的单个页表还多了 4kb
- 但是二级页表只需要存储 **已经使用** 的虚拟内存地址和物理内存地址的映射
- 进程如果实际只用了 4GB 的第一个地址和最后一个地址, 那只需要 **一张一级页表、两张二级页表**, 一张表是 4kb, 这样实际上只需要 12kb
> [!note]
> 多级页表相当于是 **第一张表就包含了整个 4GB 的虚拟内存地址** 了, 由第二张表再去细分

#### 64 位的 CPU, 还需要分更多页表
#### 缺点
- 这和 leetcode 一样, 总有 tradeoff, (牺牲内存换速度, 牺牲速度换内存)
- 这个的 tradeoff 是增加了表的映射关系, 增加了 lookup 的程序, 降低了虚拟内存和物理内存的转换速度

### Translation lookaside buffer (TLB)
这个是以某种 buffer 的形式来提高 页表 lookup 速度的
目前先不展开了

## 段页式内存管理 segmentation with paging
先不展开学了吧

## page swapping & mmap
### 内存交换 memory paging
内存交换: 将一些不常用的内存页面暂时转移到 **硬盘** 上的 **交换分区**(**swap** partition) 或 **交换文件(swap file)** 中, 以释放出物理内存供正在运行的程序使用。
- 当物理内存不足时,操作系统会选择一些不常访问的内存页面将其换出到硬盘上的交换区域。
- 当程序需要访问某个原本在内存中但已经被换出的页面时,会发生页面错误 (page fault)异常。
- 操作系统此时会从硬盘上的交换区域将该页面换入到物理内存中,然后恢复程序的执行。
- 如果物理内存仍不足,操作系统可能需要再次选择一些页面换出到硬盘上,以腾出足够的物理内存空间。
#### 例子
- 进程在读一个 10G 的日志文件, 这个数组一部分在内存, 一部分在 **磁盘**
- 读到在磁盘的元素的时候, CPU 就会触发一个 **page fault** 的 **中断**
- 中断后, CPU会 **暂停** 当前程序的执行, 交给 OS 去处理这个 page fault
- OS 在磁盘上找到需要的数据, 加载到内存上; 如果内存满了, 那会进行 **页面交换**
- 然后 OS 更新页表
- 比如说, 页表中的 entryA 中的虚拟地址 A 指向物理内存 B; B 被替换之后, entryA 中的虚拟地址 A 就不再指向物理地址 B 了, 而是被标记为 “not in memory”
- 最后把执行权交回给进程, 进程继续

#### pros and cons:
- 允许程序有远远大于物理内存的虚拟内存
- 内存交换会带来 **开销**, 降低性能 (每一次交换就是对硬盘的读写操作, 读写硬盘慢)

### mmap:
- 当多个进程都要读一个大文件的时候, 可以使用 mmap
- 系统会将这个 文件的内容 存在内存上, 让不同进程的虚拟地址都指向这个物理内存的地址
- 这样就不用每次都从资盘里把这个文件加载到内存上了
- mmap 的本质是内存共享

> [!note]
> "很多人认为当系统内存不足时应该立即触发内存不足（Out of memory、OOM）并杀掉进程，但是 Swapping 其实为系统管理员提供了另外一种选择，利用磁盘的交换空间避免程序被直接退出，以 **降低服务质量的代价换取服务的部分可用性**。"   
> -> [draveness](https://draveness.me/whys-the-design-linux-swapping/)

## 内存分配
内存分配分为 **==静态内存分配==** 和 ==**动态内存分配**==
### 内存划分
内存区域划分 在程序运行时，内存通常被划分为几个主要区域：
- 代码段（Text Segment）：存储程序的可执行代码
- 数据段（Data Segment）：存储静态变量和全局变量
- 堆（Heap）：动态内存分配区域
- 栈（Stack）：存储局部变量和函数调用信息

### 静态内存分配:
- 在 **编译** 时就分配的, 程序在运行前就已经分配好了 
- 静态 -> 内存位置是固定的, 在运行的时候不会变化 (但是静态内存也会被自动释放, 比如说函数的局部变量, 在函数执行完之后就释放了)
- 用于: 环境变量、静态变量 和 栈内存 (函数的局部变量)
- 例子, 在编译的时候, 下面这段代码让系统为 变量 a 分配了个 100 个整数的内存空间
```c
int globalVar = 100;  // 静态分配
void function() {
    int stackVar[100];  // 栈内存静态分配
}
```

### 动态内存分配:
- 在程序运行的时候根据需要, **动态** 分配
- malloc, calloc, free 这些就是动态分配. 手动地管理、释放内存, 这个内存是 **heap**. 
```c
int *dynamicArray = malloc(100 * sizeof(int));  // 动态分配
// 使用完毕后必须释放
free(dynamicArray);
```


问题: 
- 可不可以理解为: 静态内存就是 stack, 动态内存就是 heap
	- 动态内存主要在 **heap** 上
	- 静态内存主要在 **stack** 和 **data segment** 上
	- 但是 stack 也是会在程序执行的时候 动态变化 的


>[!note]
>静态内存分配主要和 stack 有关, 动态内存分配主要和 heap 有关, 但不是绝对的;    
>比如说, **全局变量** 是 **静态分配**, 但是全局变量 **既不在 stack 也不再 heap**, 在 *全局数据区 data segment*

### stack 系统自动管理
stack 上的内存分配是 **函数的局部变量** 的动态分配 (stack 里只有函数变量吗?)
-> stack 的特点是 **自动分配**, 主要和静态内存分配相关
-> 函数执行完毕之后 stack 就 pop 了,  内存被自动释放
-> 适合生命周期短的小内存

### heap 程序员手动管理
需要显式控制
-> 堆的大小比栈更大, 适合大的数据结构, 或大小不定的数据
- heap 适合 **对象生命周期较长** 的数据：如果需要在函数返回后仍然使用数据，则需要从堆中分配内存，如动态对象。


### malloc
- 进程调用 malloc 的时候, 内核会给进程分配虚拟内存, 此时不会分配物理内存, 在页表上, 虚拟内存不对应物理内存 (只是标记 **已分配**)
- 在进程访问这些内存的时候, 回去查进程的页表.
- 如果进程访问的虚拟内存在页表里没有映射到物理内存的话, 就会触发 page fault, 然后内核会处理这个page fault
	- 如果有空闲内存, 则直接分配
	- 无空闲内存, 开始 **内存回收** (kswapd异步回收, 不阻塞进程; 主动 **直接回收**)
	- 回收不过来了就 **OOM kill**
- 再把物理内存分配给进程
- 这个过程是 **lazy allocation 懒分配**


## 内存回收 Garbage Collection
### 回收方式
- [image credit](https://draveness.me/whys-the-design-linux-swapping/)
![[Pasted image 20241227000747.png|500]]
#### kswapd, 内核主动回收 
- 这是个内核线程 (?怎么理解这里的线程?), 系统后台的 **守护进程**
- 会定期地检查系统的内存使用情况 (watermark), 空闲内存低于某个值之后就会触发
- 异步发生, 不会影响进程
- 内核 **主动回收** 内存
> 应用程序在启动阶段使用的大量内存在启动后往往都不会使用，通过后台运行的守护进程，我们可以将这部分只使用一次的内存交换到磁盘上为其他内存的申请预留空间。kswapd 是 Linux 负责页面置换（Page replacement）的守护进程，它也是负责交换闲置内存的主要进程，它会在空闲内存低于一定水位时，回收内存页中的空闲内存保证系统中的其他进程可以尽快获得申请的内存 - [draveness](https://draveness.me/whys-the-design-linux-swapping/)

#### direct reclaim, 直接回收
- **进程请求内存**, 但没有足够内存的时候, 系统会直接尝试回收 (在进程请求内存的时候触发)
- 会阻塞进程
#### Out of Memory (OOM) -> 杀进程了
- 如果 **直接回收内存** 过后还是不够用的话, 就会触发 OOM
- OOM 会根据 **oom_score** 算法杀死其他进程, oom_score 由多个计算方法计算出来, 其中一个是 LRU (least recently used) **最近最少使用**
- 会导致 **至少一个** 进程在没有告警的情况下被杀死

### 页面类型
1. 文件页 (也就是磁盘文件在内存上的缓存):
	1. 如果是文件相关的页面 (即 在磁盘上也有), 会看 **内存上的数据是否和磁盘一致**,
	2. 一致的话直接释放 (干净页面), 否则会先写到磁盘 (脏页面)
2. 匿名页 (没有与任何文件有关联, 对应是进程 **堆栈** 的内存, 不与文件映射的内存): 
	1. 已经不需要了, 就直接释放了 (直接丢了), 不需要任何 I/O 操作
	2. 还需要的, 写到 **磁盘的 swap 区域** , 有 I/O 操作, 回收速度相对慢一点

#### 页面回收的优先级是
1. 首选回收文件缓存
2. 再来是不需要的匿名页
3. 最后是需要 I/O 的匿名页
> [!note]
> 页面回收的算法是 **LRU 最近最少使用**    
> LRU 的原理是:  
> - 维护两个 **双向链表**: active_list 和 inactive_list

![[Pasted image 20241114161332.png|400]]


### 如何保护一个进程不被 OOM 杀死?
#### OOM 是怎么选择进程来终止的? 
- linux 内核有个 oom_badness() 的 syscall, 会给每个进程打分, 得分最高的就会被杀死
- oom_badness 的计算方法:
```
score = process_pages + oom_score_adj*totalpages/1000
进程用的内存页面数 + oom_score_adj * 系统总页面数 / 1000
```
- 可以调整的值是 `oom_score_adj`, 默认为 0
- 调整成 -1000, 就不会被杀死了
note:
- 业务程序你别调成 -1000, 不然出现内存泄漏了, 这个程序也不会被终止; 不断地触发 OOM Kill, 反而把其他程序都终止了
- sshd (secure shell daemon) 这种很重要的程序调成 -1000


# interrupt 中断
首先, 中断不是信号
- 中断是比信号 **更底层** 的机制
- 信号是一种 IPC 的机制, 是 **进程之间** 沟通的一种方式
	- 信号是软件层面的 **异步通知事件**
	- 中断是 **硬件层面** 的 **异步通知事件**
- 中断不是用于进程之间沟通的
- 中断直接由 **内核** 处理
- 中断有软件中断和硬件中断, 相当于是硬件和内核沟通的一种方式
	- 软件中断是个 多定义 的名词; 有的地方把 信号 叫做 软件中断; 但又貌似不是同一种东西. 
	- 中断 in general 指的是发给 CPU 的 (需要紧急处理); 而信号是 IPC, 进程之间通信用的
> [!note]
> 信号是 IPC, 是发给进程的.  
> 中断是发给内核的, 用来中断 CPU 当前的工作, 需要紧急处理的事件   
> -> 信号: 面向进程   
> -> 中断: 面向 CPU 和 内核   


## claude 信号和中断比较

| 特性   | 中断                          | Linux 信号                             |
| ---- | --------------------------- | ------------------------------------ |
| 定义   | 硬件或软件机制，用于通知处理器发生了需要立即处理的事件 | 软件机制，用于进程间通信或操作系统与进程之间的通信            |
| 来源   | 可以由硬件（如I/O设备）或软件触发          | 主要由软件（内核或其他进程）触发                     |
| 处理级别 | 在内核级别处理                     | 在用户空间级别处理                            |
| 响应速度 | 通常非常快，几乎是即时的                | 相对较慢，需要等待进程调度                        |
| 处理方式 | 由专门的中断处理程序（中断服务例程）处理        | 由进程中预先定义的信号处理函数处理                    |
| 目标   | 通常针对整个系统或特定的硬件              | 针对特定的进程                              |
| 可编程性 | 主要由系统和设备驱动程序开发人员编程          | 可以由普通应用程序开发人员编程                      |
| 例子   | 键盘中断、时钟中断、网络包到达中断           | SIGINT (Ctrl+C)、SIGKILL、SIGSEGV（段错误） |

### 主要区别：
1. **层级**：中断在更底层的系统级别运作，而信号在更高层的进程级别运作。
2. **处理速度**：中断通常比信号处理得更快，因为它们直接由硬件或内核处理。
3. **用途**：中断主要用于硬件-软件交互和系统级事件，而信号主要用于进程间通信和进程管理。
4. **可编程性**：普通应用程序开发者通常不直接处理中断，但经常需要处理信号。
5. **持续性**：中断是瞬时的事件，而信号可以被阻塞或忽略一段时间。


## 网卡收到数据包 的时候发生了什么
1. 网卡收到数据包
2. DMA (direct memory access) 能够让网卡直接把数据写到内存, 不需要 CPU 的帮助; 数据此时是写到 ring buffer 里
3. 网卡发起 **硬中断**
4. CPU 响应硬中断, 执行中断处理程序
5. 中断处理程序触发 **软中断**
6. 软中断触发协议栈对数据包的处理程序
7. 数据到达进程

注意: 
- 在高 I/O 的场景, 如果网卡一直发起 中断 , 那 CPU 就要没完没了地处理 I/O 了就不用执行进程了
-> Linux 的 **NAPI 机制**: 
- 收到中断之后, 中断的处理程序会屏蔽中断一段时间, 然后用 **轮询** 的方式去读数据包;
	- 轮询由内核定期触发 **软中断 soft irq** 来实现, 执行 `poll()`
- 中断处理程序将设备放入 NAPI 调度队列，并禁用中断
- 数据包处理完了之后再重启中断

## control c 发生了什么
1. 用户按下 control c
2. 键盘触发一个 **硬件中断** interrupt
3. 内核收到中断, 内核的 **中断处理程序** 把这个信号发给 **终端驱动程序 (shell, bash)** ==内核在这里只读取这个 **组合键**==
4. 由终端程序识别这个组合键, 并决定发送一个 sigint 信号 (signal interrupt) 给进程
5. 进程抓捕这个信号并处理, 处理方式是由进程自己决定, 进程可以选择直接**忽略**
**进程终止不是必然的, 是进程自己决定的**
![[Pasted image 20241122173832.png|700]]



# file lock 文件锁
内核中有个 **锁管理模块** 专门来管理 
锁的分类:
- 独占锁 exclusive lock (write lock), 共享锁 shared lock (read lock)
- 建议锁 (记录锁) advisory lock, 强制锁 mandatory lock

当一个进程想要写入一个已经被锁的文件 (进程想要给已经有锁的文件加独占锁), 进程会被堵塞; CPU 会把 CPU 时间分配给其他进程, 被堵塞的进程重新回到调度队列

# IPC - 消息队列 (TBC)