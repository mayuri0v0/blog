---
title: CTF Reverse - N17 CTF rev/2
date: 2026-09-29
category: CTF
---

# CTF Reverse - N17 CTF rev/2

## 1. 题目信息

| 项       | 内容                                          |
| -------- | --------------------------------------------- |
| 类别     | Reverse（逆向）                               |
| 语言     | Haskell（GHC 编译）                           |
| 提供文件 | `Main.dump-asm`、`Main.dump-simpl`、`out.txt` |
| 目标     | 找出 flag                                     |

**Flag：`K17{a_M0NaD_1s_4_M0n0Id_1n_th3_c4t3gORy_0f_3Nd0FuNC70r5}`**

---

## 2. 核心思路

这是一道用 **Haskell** 写的逆向题。拿到手的不是 C/C++ 二进制，而是 GHC 编译器的两种中间产物：

- `Main.dump-simpl` —— **GHC Tidy Core**（`-ddump-simpl` 输出），几乎等价于源码级逻辑，是解题关键；
- `Main.dump-asm` —— 编译器生成的汇编（本题不需要看，Core 已足够）；
- `out.txt` —— 程序运行后画出的 **Julia 分形 ASCII 图**（烟雾弹）。

**一句话流程：** `main` 把一段十六进制密文先解密成明文，明文里同时藏着 flag 和 5 个分形参数，再用这些参数渲染一张 Julia 分形图写进 `out.txt`。

```text
hex密文 ──fromHex──▶ 字节串 ──decipher(key)──▶ 明文
   明文 = "flag  cx  cy  maxIter  width  height"
   后5个参数 ──renderJulia──▶ out.txt
```

---

## 3. 逆向分析（从 Tidy Core 还原源码）

`Main.dump-simpl` 里暴露了三个模块（`Decode.hs`、`Fractal.hs`、`Main.hs`），核心逻辑如下。

### 3.1 `Decode.hs` —— 解密

```haskell
xorChar a b   = chr (ord a `xor` ord b)          -- 字符按位异或
unsubsChar a  = chr ((ord a - 67) `mod` 128)     -- 减 67 后对 128 取模
decipher ct key = zipWith (\c k -> unsubsChar (xorChar k c))
                          ct (cycle key)          -- key 无限循环，逐位异或后再减 67 取模
fromHex input = map (\(a,b) -> chr (readHex [a,b])) (pairs input)  -- 每两个 hex 字符转一字节
```

### 3.2 `Fractal.hs` —— Julia 分形渲染

```haskell
palette = " .-:=+*#%@"                              -- 10 级明暗

renderJulia cx cy maxIter width height = ...
-- 对每个像素 (x, y)：
--   z0 = (-1.8 + 3.6·x/(width-1))  +  ((-1.0 + 2.0·y/(height-1)) · 0.5) · i
--   c  = cx + cy·i
--   z  = z² + c  迭代，直到 |z| > 2 或达到 maxIter，记迭代次数 n
--   索引 = min 9 (n·10 // (maxIter+1))，取 palette[索引] 作为该像素字符
```

### 3.3 `Main.hs` —— 主逻辑

```haskell
main = writeFile "out.txt" (renderJulia cx cy maxIter width height)
  where (flag : cx : cy : maxIter : width : height : _) =
          words (decipher (fromHex 密文) "#!s3kur1ty")
```

其中密文与 key 是硬编码的字符串：

- 密文：`2d55090d4f576242655d24030705490250210748502d54111f4450065f0f010704041d5f6024485b500851457a5201384c68255b000613351141070859560b4a1c03094a0e1a505007471d0e0749080a5442074818160e48170f56`
- key：`#!s3kur1ty`

---

## 4. 解密推演（前 12 字节）

解密公式：`r[i] = ((ct[i] XOR key[i mod 11]) - 67) mod 128`

| i    | 密文 hex | key  | xor  | xor−67 | mod 128 | 明文 |
| ---- | -------- | ---- | ---- | ------ | ------- | ---- |
| 0    | 2d       | `#`  | 14   | −53    | 75      | `K`  |
| 1    | 55       | `!`  | 116  | 49     | 49      | `1`  |
| 2    | 09       | `s`  | 122  | 55     | 55      | `7`  |
| 3    | 0d       | `3`  | 62   | −5     | 123     | `{`  |
| 4    | 4f       | `k`  | 36   | −31    | 97      | `a`  |
| 5    | 57       | `u`  | 34   | −33    | 95      | `_`  |
| 6    | 62       | `r`  | 16   | −51    | 77      | `M`  |
| 7    | 42       | `1`  | 115  | 48     | 48      | `0`  |
| 8    | 65       | `t`  | 17   | −50    | 78      | `N`  |
| 9    | 5d       | `y`  | 36   | −31    | 97      | `a`  |
| 10   | 24       | `#`  | 7    | −60    | 68      | `D`  |
| 11   | 03       | `!`  | 34   | −33    | 95      | `_`  |

前 12 字节解出 `K17{a_M0NaD_`，即 flag 开头。

完整明文：

```text
K17{a_M0NaD_1s_4_M0n0Id_1n_th3_c4t3gORy_0f_3Nd0FuNC70r5} -0.745643887 0.113825904 180 96 32
```

`words` 拆分：

| 字段    | 值                                                         |
| ------- | ---------------------------------------------------------- |
| flag    | `K17{a_M0NaD_1s_4_M0n0Id_1n_th3_c4t3gORy_0f_3Nd0FuNC70r5}` |
| cx      | `-0.745643887`                                             |
| cy      | `0.113825904`                                              |
| maxIter | `180`                                                      |
| width   | `96`                                                       |
| height  | `32`                                                       |

---

## 5. 完整复现脚本（Python，已实测与 out.txt 逐字节一致）

```python
# -*- coding: utf-8 -*-
"""
N17 CTF rev/2 完整解题脚本
运行后：打印明文、flag，并还原出与题目 out.txt 完全一致的 Julia 分形图。
"""
HEX = '2d55090d4f576242655d24030705490250210748502d54111f4450065f0f010704041d5f6024485b500851457a5201384c68255b000613351141070859560b4a1c03094a0e1a505007471d0e0749080a5442074818160e48170f56'
KEY = '#!s3kur1ty'
PALETTE = " .-:=+*#%@"

# ---------- Decode.hs ----------
def from_hex(s):
    return bytes.fromhex(s)

def decipher(ct, key):
    out = []
    for i, b in enumerate(ct):
        k = ord(key[i % len(key)])   # cycle key
        x = b ^ k                    # xorChar
        r = (x - 67) % 128           # unsubsChar
        out.append(chr(r))
    return ''.join(out)

# ---------- Fractal.hs ----------
def render_julia(cx, cy, max_iter, width, height):
    rows = []
    for y in range(height):
        row = []
        for x in range(width):
            zr = -1.8 + 3.6 * x / (width - 1)
            zi = (-1.0 + 2.0 * y / (height - 1)) * 0.5
            n = 0
            while True:
                if zr * zr + zi * zi > 4.0:   # magnitude z > 2.0
                    break
                if n >= max_iter:
                    break
                zr, zi = zr * zr - zi * zi + cx, 2.0 * zr * zi + cy  # z = z*z + c
                n += 1
            idx = min(len(PALETTE) - 1, n * len(PALETTE) // (max_iter + 1))
            row.append(PALETTE[idx])
        rows.append(''.join(row))
    return '\n'.join(rows)

# ---------- Main.hs ----------
if __name__ == '__main__':
    plain = decipher(from_hex(HEX), KEY)
    words = plain.split()
    flag = words[0]
    cx, cy = float(words[1]), float(words[2])
    max_iter, width, height = int(words[3]), int(words[4]), int(words[5])

    print("=== 明文 ===")
    print(plain)
    print()
    print("=== FLAG ===")
    print(flag)
    print()
    print("=== 还原的 out.txt ===")
    print(render_julia(cx, cy, max_iter, width, height))
```

**运行输出（节选）：**

```text
=== 明文 ===
K17{a_M0NaD_1s_4_M0n0Id_1n_th3_c4t3gORy_0f_3Nd0FuNC70r5} -0.745643887 0.113825904 180 96 32

=== FLAG ===
K17{a_M0NaD_1s_4_M0n0Id_1n_th3_c4t3gORy_0f_3Nd0FuNC70r5}

=== 还原的 out.txt ===
                                        +@=++:+@==-....**#@
                                        @=:=-:+@+:.....:*%:@              -
                                      ..-=@-@#=::+@...*:@..@@+           ..
                                      ...（共 32 行，与题目 out.txt 逐字节一致）
```

---

## 6. Flag

```text
K17{a_M0NaD_1s_4_M0n0Id_1n_th3_c4t3gORy_0f_3Nd0FuNC70r5}
```

### Flag 含义

去 leetspeak 后：

> **"A monad is a monoid in the category of endofunctors"**

（单子是自函子范畴上的幺半群）—— Haskell / 范畴论圈最著名的梗，与本 Haskell 题相呼应。

---

## 7. 附录：为什么不用看汇编

Haskell 经 GHC 编译后，其 `.dump-simpl`（Tidy Core）保留了大量可读信息（函数名、字符串字面量、类型、递归结构）。逆向此类题型的通用套路：

1. 直接读 `-ddump-simpl`（或 `.hi` 接口、字符串表），还原高层逻辑；
2. 定位硬编码字符串（密文、key、调色板）；
3. 用脚本复刻纯函数（`decipher`、`fromHex`、`renderJulia`），无需还原 STG/Cmm 汇编。

本题所有逻辑都在 Core 层就位，汇编文件只是干扰项。

<CommentService />
