---
title: CTF Reverse - CTF^2 REVERSE3
date: 2026-09-15
category: CTF
---



逆向练习，来自 https://ctf2.dasctf.com/, 难度1⭐/5⭐

题目程序接收一个长度为 33 的字符串，经过一系列变换后与目标数组比较，若匹配则输出 `Right! Good Job!` 并打印该字符串作为 flag。

## 1. 运行程序

直接运行程序，提示输入：

```
Give me your code:
```

随便输入一个字符串，程序提示 `Wrong!` 并退出。说明需要找到正确的输入。

## 2. 静态分析

使用 IDA 打开程序，找到 `main` 函数，反编译代码如下：

```c
int __fastcall main(int argc, const char **argv, const char **envp)
{
  char Str[104]; // [rsp+20h] [rbp-70h] BYREF
  int j; // [rsp+88h] [rbp-8h]
  int i; // [rsp+8Ch] [rbp-4h]

  sub_402230(a1: argc, a2: argv, a3: envp);
  sub_40E640(a1: "Give me your code:\n");
  sub_40E5F0(a1: "%s", Str);
  if ( strlen(Str) != 33 )
  {
    sub_40E640(a1: "Wrong!\n");
    system(Command: "pause");
    exit(Code: 0);
  }
  for ( i = 0; i <= 32; ++i )
  {
    byte_414040[i] = Str[dword_40F040[i]];
    byte_414040[i] ^= LOBYTE(dword_40F040[i]);
  }
  for ( j = 0; j <= 32; ++j )
  {
    if ( byte_40F0E0[j] != byte_414040[j] )
    {
      sub_40E640(a1: "Wrong!\n");
      system(Command: "pause");
      exit(Code: 0);
    }
  }
  sub_40E640(a1: "Right!Good Job!\n");
  sub_40E640(a1: "Here is your flag: %s\n", Str);
  system(Command: "pause");
  return 0;
}
```

程序首先检查输入字符串长度必须为 33。然后进入一个循环，对每个 `i`（0~32）：
- 从输入字符串 `Str` 中取出下标为 `dword_40F040[i]` 的字符；
- 将该字符与 `dword_40F040[i]` 的低字节进行异或；
- 结果存入 `byte_414040[i]`。

最后将 `byte_414040` 与 `byte_40F0E0` 数组逐字节比较，全部相等则成功。

## 3. 关键数据

在 IDA 的数据段中找到两个数组：

**索引数组 `dword_40F040`**（共 33 个元素，是 0~32 的一个排列）：

```c
int index[33] = {
    9, 10, 15, 23, 7, 24, 12, 6, 1, 16, 3, 17, 32,
    29, 11, 30, 27, 22, 4, 13, 19, 20, 21, 2, 25,
    5, 31, 8, 18, 26, 28, 14, 0
};
```

**目标数组 `byte_40F0E0`**（取前 33 个非零字节）：

```c
int expect[33] = {
    103, 121, 123, 127, 117, 43, 60, 82, 83, 121, 87,
    94, 93, 66, 123, 45, 42, 102, 66, 126, 76, 87,
    121, 65, 107, 126, 101, 60, 92, 69, 111, 98, 77
};
```

## 4. 加密逻辑与解密思路

加密过程可表示为：

```c
byte_414040[i] = Str[index[i]] ^ index[i];
```

其中 `index[i]` 是索引数组的第 `i` 个元素。由于 `index` 是 0~32 的一个排列，我们可以通过逆运算还原 `Str`：

```c
Str[index[i]] = expect[i] ^ index[i];
```

遍历 `i` 从 0 到 32，即可填充 `Str` 的每一个位置。

## 5. 解密脚本

```cpp
#include <string>
#include <iostream>

int main()
{
    int index[33] = {9, 10, 15, 23, 7, 24, 12, 6, 1, 16, 3, 17, 32,
                     29, 11, 30, 27, 22, 4, 13, 19, 20, 21, 2, 25,
                     5, 31, 8, 18, 26, 28, 14, 0};
    int expect[33] = {
        103, 121, 123, 127, 117, 43, 60, 82, 83, 121, 87,
        94, 93, 66, 123, 45, 42, 102, 66, 126, 76, 87,
        121, 65, 107, 126, 101, 60, 92, 69, 111, 98, 77};

    std::string s(33, '0');

    for (int i = 0; i <= 32; i++)
    {
        s[index[i]] = (expect[i] ^ index[i]);
    }

    std::cout << s;
}
```

运行后输出：

```
MRCTF{Tr4nsp0sltiON_Clph3r_1s_3z}
```

## 6. 结果验证

将得到的字符串作为输入运行原程序，程序输出：

```
Right!Good Job!
Here is your flag: MRCTF{Tr4nsp0sltiON_Clph3r_1s_3z}
```

验证正确。

<CommentService />
