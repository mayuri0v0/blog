---
layout: post
title:  "Crackmes逆向练习 - S90x123's passord key gen"
date:   2026-08-30 10:00:00 +0800
categories: 逆向工程
---



逆向练习, 来自[crackmes.one](https://crackmes.one/crackme/6a6654c38ab4ef0d9d8abc68), 难度简单



题目压缩包里只有一个exe, 自然地, 我们先运行看看怎么个事

![1]({% link assets/images/2026-08-30/1.png %})

![2]({% link assets/images/2026-08-30/2.png %})



先静态分析, 找到密码判断逻辑, IDA中搜索"WRONG!":

![3]({% link assets/images/2026-08-30/3.png %})



可以看到上面就是判断密码正确的逻辑

```c
  if ( (void *)Size == Buf2[1] && (!Size || !memcmp(Buf1, Buf2[0], Size)) )
  {
      ...
  }
```



追踪一下这几个参数

Buf1显然存储我们输入的密码, 因为这里对Buf1有格式检查

```c
if ( Size == 31 && *((_BYTE *)Buf1 + 7) == '-' && *((_BYTE *)Buf1 + 15) == '-' && *((_BYTE *)Buf1 + 23) == '-' )
{
	...
}
```

![4]({% link assets/images/2026-08-30/4.png %})



Buf2[0]自然指向正确的密码

但是静态分析Buf2[0]的构造填充是一个痛苦的过程, 可以看到反编译代码中有很多其他的调用, 逐步分析非常麻烦, 所以我们转向动态分析



使用x64dbg并开启ScyllaHide插件, 这个插件用于反反调试, 事实上在关闭插件后, 程序确实会在调试时直接退出

在memcmp处打断点即可

![5]({% link assets/images/2026-08-30/5.png %})

随便输入一个格式正确的密码aaaaaaa-aaaaaaa-aaaaaaa-aaaaaaa

![6]({% link assets/images/2026-08-30/6.png %})

一目了然, rdx指向密码存储的位置



程序中输入密码, 结果正确:

![7]({% link assets/images/2026-08-30/7.png %})
