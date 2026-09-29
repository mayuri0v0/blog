---
title: CTF Web - 机器人验证挑战
date: 2026-09-29
category: CTF
---

# CTF Web - 机器人验证挑战

## 题目概述

题目是一个网页，包含一个“验证你是机器人”的弹窗挑战。用户需要连续答对 10 道随机生成的数学/计算题，且每道题有时间限制，答错或超时会重置进度。全部答对后，页面会显示 flag。

题目源码全部在前端 JavaScript 中，没有后端参与。因此我们可以直接审计代码，寻找绕过验证或直接提取 flag 的方法。

## 源码分析

核心逻辑位于一个立即执行函数中。我们重点关注 `printFlag` 函数：

```js
function printFlag(){
  if(state !== String.fromCharCode(99,111,109,112,108,101,116,101) ||
     !Number.isInteger(numCorrect) ||
     numCorrect < requiredCorrect ||
     !(requiredCorrect > 0)) return false;

  const _0x91 = [0x25,0x71,0x64,0xbc,0xc5,0x62,0xdc,0xbe,0x6d,0x45,
    0x63,0x67,0xd7,0xc8,0xea,0x12,0x59,0x8a,0x38,0xd0,
    0xe7,0x4a,0xe1,0x9b,0x57,0xf8,0x18,0x35,0x92,0x61,
    0xb0,0x92,0xea,0xd8,0xa6,0x08,0x2d,0x6b,0xc6,0x83,
    0x2f,0xb2,0x4f,0xf7,0x4d,0x5d,0x44,0x3a,0x58,0x45];

  let _0x42 = 0x35 + state.length * 0x11;

  const _0x17 = new TextDecoder().decode(
    Uint8Array.from(_0x91, (_0x6a, _0x2b) => {
      _0x42 = (_0x42 * 0x21 + _0x2b + 0x11) & 0xff;
      return _0x6a ^ _0x42;
    })
  );

  document.getElementById("flag").textContent = _0x17;
  document.getElementById("flag-result").hidden = false;
  console.log(_0x17);
  return true;
}
```

可以看到：

- 触发条件：`state === "complete"` 且 `numCorrect >= requiredCorrect`（`requiredCorrect = 10`）。
- 满足条件后，会执行一段异或解密，生成 flag 字符串并显示在 `#flag` 元素中。

由于整个验证都在前端，我们可以通过多种方式让网站输出 flag。

## 方法一：静态解密混淆数组（最快）

`printFlag` 中的解密逻辑是：

初始密钥 `_0x42 = 0x35 + state.length * 0x11`。
因为 `state` 必须是 `"complete"`，长度为 8，所以：

```text
_0x42 = 0x35 + 8 * 0x11 = 0x35 + 0x88 = 0xBD
```

遍历 `_0x91` 数组，对每个字节：

```text
_0x42 = (_0x42 * 0x21 + i + 0x11) & 0xff
plainByte = cipherByte ^ _0x42
```

最后用 `TextDecoder` 将字节数组解码为字符串。

在浏览器控制台或 Node.js 中运行：

```js
const _0x91 = [
  0x25,0x71,0x64,0xbc,0xc5,0x62,0xdc,0xbe,0x6d,0x45,
  0x63,0x67,0xd7,0xc8,0xea,0x12,0x59,0x8a,0x38,0xd0,
  0xe7,0x4a,0xe1,0x9b,0x57,0xf8,0x18,0x35,0x92,0x61,
  0xb0,0x92,0xea,0xd8,0xa6,0x08,0x2d,0x6b,0xc6,0x83,
  0x2f,0xb2,0x4f,0xf7,0x4d,0x5d,0x44,0x3a,0x58,0x45
];

let k = 0x35 + "complete".length * 0x11; // 0xBD

const flag = new TextDecoder().decode(
  Uint8Array.from(_0x91, (c, i) => {
    k = (k * 0x21 + i + 0x11) & 0xff;
    return c ^ k;
  })
);

console.log(flag);
```

输出：

```text
K17{y0u_w1ll_noW_b3_sp@red_froM_tHe_AI_rev0lu+1on}
```

## 方法二：开发者工具断点修改变量

打开网页，按 F12 打开开发者工具。

切换到 Sources 面板，找到包含挑战逻辑的 JS 文件。

在 `feedback` 函数中找到这一行并设置断点：

```js
if (numCorrect >= requiredCorrect) {
```

回到页面，点击“开始挑战”，随便输入一个错误答案并提交。

代码会在断点处暂停。在右侧 Scope 面板中展开 Closure，可以看到闭包内的变量：

- `state`
- `numCorrect`
- `requiredCorrect`（const，不可修改）

双击 `state` 的值，修改为 `"complete"`；双击 `numCorrect`，修改为 `10`。

按 F8 继续执行，代码进入 `if` 分支，执行 `printFlag()`，flag 显示在页面上。

## 方法三：控制台重写 Math.random + 自动答题

题目中的 `generateChallenge` 使用了 `Math.random` 来随机出题。如果把 `Math.random` 重写为始终返回 0，所有题目都会变成 `case 0`：

```js
n = Math.floor(Math.random() * 100000000); // n = 0
return ["Please enter the square root of", 0, "to 5 decimal places", Math.sqrt(0).toFixed(5)];
```

答案固定为 `"0.00000"`。然后写一个自动脚本，不断检测输入框是否可用，一旦可用就填入答案并提交。连续答对 10 题后，`printFlag` 会自动执行并显示 flag。

在浏览器控制台（Console）中粘贴以下代码并回车：

```js
// 保存原始 Math.random
const originalRandom = Math.random;
// 重写 Math.random，使所有随机数变为 0
Math.random = () => 0;

// 点击开始挑战
document.getElementById("open-challenge").click();

// 自动答题函数
const autoAnswer = () => {
  const input = document.getElementById("challenge-input");
  const submit = document.getElementById("submit-button");
  if (input && !input.disabled && !submit.disabled) {
    input.value = "0.00000";
    submit.click();
  }
};

// 每 50 毫秒检查一次
const interval = setInterval(autoAnswer, 50);

// 监听 flag 出现
const checkFlag = setInterval(() => {
  const flagResult = document.getElementById("flag-result");
  if (flagResult && !flagResult.hidden) {
    clearInterval(interval);
    clearInterval(checkFlag);
    // 恢复 Math.random
    Math.random = originalRandom;
    console.log("Flag:", document.getElementById("flag").textContent);
  }
}, 100);
```

运行后，脚本会自动完成 10 道题（约 20 秒），页面显示 flag，控制台也会打印出来。

## 最终 Flag

无论使用哪种方法，输出结果都是：

```text
K17{y0u_w1ll_noW_b3_sp@red_froM_tHe_AI_rev0lu+1on}
```

<CommentService />
