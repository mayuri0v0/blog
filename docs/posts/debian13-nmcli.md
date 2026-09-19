---
title: Debian 13 - nmcli device wifi list 为空
date: 2026-09-19
category: 未归类
---

# Debian 13 安装时连了 WiFi，结果 `nmcli device wifi list` 一片空白？

最近在新电脑上装 Debian 13，遇到一个神秘问题：系统能正常连 WiFi，ping 也通，但 `nmcli device wifi list` 却什么都看不到。

## 问题现象

- 安装 Debian 13 时，引导程序里连接了路由器的 WiFi，以下载软件包。
- 装完后每次重启，WiFi 自动连接，`ping` 正常。
- 但执行 `nmcli device wifi list`，没有任何输出，看不到周围的 WiFi。
- `nmcli device status` 里，无线接口 `wlo1` 显示为 `unmanaged`。

## 排查过程

先看 NetworkManager 的配置：

```bash
cat /etc/NetworkManager/NetworkManager.conf
```

输出：

```ini
[main]
plugins=ifupdown,keyfile

[ifupdown]
managed=false
```

`managed=false` 是 Debian 的默认值，意思是：如果接口已经在 `/etc/network/interfaces` 里配置了，NetworkManager 就尊重传统配置，不接管它。

再看 `/etc/network/interfaces`：

```bash
cat /etc/network/interfaces
```

果然发现了安装器写入的配置：

```
# The primary network interface
allow-hotplug wlo1
iface wlo1 inet dhcp
    wpa-ssid "路由器wifi名"
    wpa-psk "我的密码"
```

真相大白。

## 根本原因

Debian 安装器为了在安装阶段联网，会使用 `ifupdown` + `wpa_supplicant`，把 WiFi 配置直接写进 `/etc/network/interfaces`。进入系统后，NetworkManager 看到 `wlo1` 已经被 `interfaces` 声明，就认为这个接口归 `ifupdown` 管，于是把它标记为 `unmanaged`。

一个不受 NetworkManager 管理的设备，自然不会去执行 WiFi 扫描。所以 `nmcli device wifi list` 返回空，但开机时 `ifupdown` 仍然按照 `wpa-ssid` 和 `wpa-psk` 连上了 WiFi，导致“能上网但看不到列表”的奇怪现象。

```
interfaces 里有 wlo1 配置
        ↓
NetworkManager 认为 wlo1 归 ifupdown 管
        ↓
wlo1 被标记为 unmanaged
        ↓
NetworkManager 不扫描 wlo1
        ↓
nmcli device wifi list 为空
        ↓
但 ifupdown 在开机时连上了 WiFi
        ↓
所以 ping 正常
```

## 解决方案

决定把 WiFi 管理权交给 NetworkManager。

### 1. 备份

```bash
sudo cp /etc/network/interfaces /etc/network/interfaces.bak
sudo cp /etc/NetworkManager/NetworkManager.conf /etc/NetworkManager/NetworkManager.conf.bak
```

### 2. 清理 `/etc/network/interfaces`

```bash
sudo nano /etc/network/interfaces
```

把 `wlo1` 相关的几行注释掉或删除：

```
# allow-hotplug wlo1
# iface wlo1 inet dhcp
#     wpa-ssid "路由器wifi名"
#     wpa-psk "我的密码"
```

最终文件只保留：

```
source /etc/network/interfaces.d/*

auto lo
iface lo inet loopback
```

顺便检查一下子目录：

```bash
ls -la /etc/network/interfaces.d/
```

如果里面也有 `wlo1` 相关文件，一并移走或注释。

### 3. 修改 NetworkManager 配置

```bash
sudo nano /etc/NetworkManager/NetworkManager.conf
```

把 `[ifupdown]` 段改成：

```ini
[ifupdown]
managed=true
```

### 4. 重启 NetworkManager 并强制接管

```bash
sudo systemctl enable --now NetworkManager
sudo systemctl restart NetworkManager
sudo nmcli device set wlo1 managed yes
```

### 5. 重新连接 WiFi

因为 NetworkManager 之前没管理过 `wlo1`，可能没有保存的密码，需要重新连一次：

```bash
nmcli device wifi rescan
nmcli device wifi list
nmcli device wifi connect "路由器wifi名" password "我的密码"
```

连接成功后，设置自动连接：

```bash
nmcli connection modify "路由器wifi名" connection.autoconnect yes
```



## 验证

```bash
nmcli device status
```

`wlo1` 应该显示为 `connected` 或 `disconnected`，而不是 `unmanaged`。

```bash
nmcli device wifi list
```

此时应该能看到周围的 WiFi 列表了。

## 总结

- Debian 安装器在安装阶段连接 WiFi 时，会把配置写入 `/etc/network/interfaces`。
- 进入桌面后，如果使用 NetworkManager，就应该把 WiFi 管理权交给它，避免两套网络管理工具冲突。
- `managed=false` 是 Debian 的默认设置，配合 `interfaces` 里的配置，会导致接口被标记为 `unmanaged`。
- 解决方法：清理 `interfaces` 中的无线接口配置，把 `managed` 改为 `true`，重启 NetworkManager，重新连接 WiFi。
- 如果你坚持继续用 `ifupdown` 管理 WiFi，那 `nmcli device wifi list` 看不到网络是正常的，因为扫描是 NetworkManager 的功能。

<CommentService />
