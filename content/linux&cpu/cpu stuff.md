[putting the 'you' in cpu](https://cpu.land/the-basics)
# cpu 咋工作的
- 需要执行代码存在内存上
- cpu 通过 **总线 buses** 去 内存 上获取数据 (二进制)
- cpu 上的 instruction pointer (figurative name) 指向内存, 一般就是依据 machine code 在内存上存储的位置, 按顺序执行; (machine code 指的是 assembly 这种)
	- 有的 instruction 也可以让 instruction pointer 跳到其他地方 (function call, conditions)
- 有的 register 允许直接和 machine code 交互, 
	- 比如, assembly `add eax, 512`, 代表在 eax 这个 register 上添加个啥, 具体是啥先不展开学了
- CPU 目前处于哪个 ring, 即 current privilege level (CPL), 也是存在 register 上的 (一个叫做 `cs` 的 register)
	- 一些想法:
		- 实际上 cpu 的这个 ring 几, 不过是一个寄存器里的数字罢了
		- ring 几 像是个 if condition: if ring = 0, 才可以执行 xyz


## 执行代码的时候发生了什么
- 代码写完之后被编译, 编译就是个把代码转化成 **机器代码** 的过程
- 操作系统 (是操作系统吗?) 把编译好的代码加载到 内存 上
- cpu 根据 instruction pointer 执行:
	1. **Fetch**: 从内存中取指令
    2. **Decode**: 解析指令, 确定操作类型和操作数
    3. **Execute**: 根据解析结果执行指令, 例如进行算术运算、内存访问等
    4. **Writeback**: 将计算结果写回寄存器或内存
    5. **更新程序计数器**: 继续下一条指令

> [!note]
> 进程这些东西本身是 操作系统 的 抽象概念; 对于 CPU 来说, 它只是读命令、计算, 他是不知道 process 的边界啥的, 反正就是执行, 也不知道自己在执行哪个 process


# 从 user 到 kernel (tbc)
> User space to kernel space control transfers are accomplished using a processor feature called [_software interrupts_](https://en.wikipedia.org/wiki/Interrupt#Software_interrupts)

todo:
- software interrupt 时 processor 的 feature? 不是 os 的 feature?
- 操作系统层面和 CPU 硬件层面分别发生了什么? 

> software interrupts are safe because the processor has been preconfigured _by the OS_ with where in the OS code to jump to.
- 咋理解这个 preconfigure? 
- 所以 software interrupt 到底是 os 的 feature 还是 cpu 的 feature

# 问题
- 对 CPU 这个东西的理解还是很模糊, 比如说这两句话
	- “Intel and AMD managed not to coordinate very well on x86-64; it actually has _two_ sets of optimized system call instructions.”
	- "AMD and Intel processors have slightly different compatibility with these instructions. `SYSCALL` is generally the best option for 64-bit programs, while `SYSENTER` has better support with 32-bit programs."
	- CPU 是硬件, sys call 是 linux 软件层面的概念, 硬件和软件之间的交互是怎么样的, 为什么会有不同的 optimized sys call 的差别?

- CPU 的不同的 ring 到底是咋运作的; 我现在理解的是, kernel、user 是 os 的概念, 这个概念是怎么和 cpu 的 ring 结合的? 有什么样的机制能够阻止 ring 3 状态下的 cpu 执行 ring 0 才能执行的操作?


# CPU time
clock 到了之后是 trigger 了个 hardware interrupt