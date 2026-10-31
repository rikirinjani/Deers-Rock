# InstaBox stack adaptation: an Ubuntu 24.04 chroot on the Debian 13 free machine (2026-11-01)

Why: the free InstaBox machine (`exp-g-box`, template `agent-browser`) is Debian 13, which has no `mysql-server-8.0` and no `openjdk-17`. The benchmark was built and run on Ubuntu 24.04 with exact package versions. A chroot keeps those versions and runs on the host kernel. Deviation to record in any result: host kernel `6.18.54-instabox`, 4 vCPU / 8 GiB, host userland Debian 13, benchmark userland Ubuntu 24.04 in a chroot.

Built on 2026-11-01 (all as root via `sudo` on the machine; `/data` is the 20 GiB persistent disk, the chroot is 1.9 GB):

```bash
# host (Debian 13)
sudo apt-get install -y mmdebstrap ubuntu-keyring
sudo mkdir -p /data/noble
sudo mmdebstrap --arch=amd64 --variant=minbase --keyring=/usr/share/keyrings/ubuntu-archive-keyring.gpg \
     --components=main,universe noble /data/noble http://us.archive.ubuntu.com/ubuntu      # 82 s
# (debootstrap was tried first and was far too slow here: its per-package wget stalled)

# updates and security pockets, so the versions equal the source box
printf 'deb http://us.archive.ubuntu.com/ubuntu noble main universe\ndeb http://us.archive.ubuntu.com/ubuntu noble-updates main universe\ndeb http://us.archive.ubuntu.com/ubuntu noble-security main universe\n' | sudo tee /data/noble/etc/apt/sources.list
sudo rm -f /data/noble/etc/apt/sources.list.d/*

# mounts, no services started by dpkg, DNS
sudo mount -t proc proc /data/noble/proc; sudo mount --bind /dev /data/noble/dev; sudo mount --bind /sys /data/noble/sys
printf '#!/bin/sh\nexit 101\n' | sudo tee /data/noble/usr/sbin/policy-rc.d; sudo chmod +x /data/noble/usr/sbin/policy-rc.d
sudo cp /etc/resolv.conf /data/noble/etc/resolv.conf

# packages (inside the chroot)
sudo chroot /data/noble bash -c 'export DEBIAN_FRONTEND=noninteractive; apt-get update;
  apt-get install -y mysql-server-8.0 openjdk-17-jdk openjdk-17-jre xvfb faketime python3 \
                     procps psmisc e2fsprogs openssl ca-certificates curl wget less'
```

Versions in the chroot equal the source box: `mysql-server-8.0 8.0.46-0ubuntu0.24.04.4`, `openjdk-17 17.0.20.1+1-1~24.04`, `xvfb 2:21.1.12-1ubuntu1.9`, `python3 3.12.3-0ubuntu2.1`, `faketime 0.9.10-2.1`.

Use: `instabox exec exp-g-box -- sudo chroot /data/noble <command>`. The three mounts do not survive a suspend or restart: repeat the `mount` lines first. There is no systemd inside the chroot: start MySQL by hand (`mysqld --user=mysql &`, `innodb_buffer_pool_size=3G` in a file under `/etc/mysql/mysql.conf.d/`, not the 6G of the source box: the machine has 8 GiB). Limits of the free plan: 480 min per run, 30 min idle pause, one machine.

Snapshot `chroot-ready-20261101` holds this state (stack installed; no archives, no repo, no databases yet). Reset the machine to it by creating a machine from the snapshot (the plan allows one machine: delete the old one first, owner's decision).

Not shown by this: that the benchmark runs in the chroot (that is the rehearsal), and that processes survive an idle pause.
