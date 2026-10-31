# Third box for the clean-box rehearsal: what is needed (2026-11-01)

Source of the numbers: the replacement box that runs P13-P22 today (`docs/asset_export_20261023.md`: 2 vCPU / 16 GB / 94 GB, Ubuntu 24.04.5, x86_64; 20 GB used at P22), the P22 chain timings (C4 real-300 about 26 min, whole chain about 1 h 7 min on that box) and the restore steps in the export doc.

## Must have (the rehearsal fails or proves nothing without these)
| Item | Need | Why |
|---|---|---|
| Machine | a **full VM or VPS**, not a container | `chattr +i` (the frozen-file discipline) needs a real ext4/xfs root and `CAP_LINUX_IMMUTABLE`; most containers lack it. WSL2 on ext4 usually works but is not the target. |
| CPU arch | **x86_64** | the Khanza jar and the harness were built and run there; ARM is a different experiment |
| OS | **Ubuntu 24.04 LTS** | same package versions: `openjdk-17-jdk`, `mysql-server-8.0` (8.0.46 on the source box), `xvfb`, `faketime`, `python3` |
| RAM | **16 GB** (8 GB minimum) | MySQL `innodb_buffer_pool_size=6G` was used; the sik dump loads in about 1 min with it |
| Disk | **60 GB free** (source box: 94 GB, 20 GB used) | archives 0.7 GB + unpacked trees + two databases + run outputs; results were 2.8 GB |
| CPU count | **2 vCPU** (4 is better) | the GUI harness is single-threaded; the chain took about 1 h at 2 |
| Access | root over ssh with a key; the ssh alias goes in `~/.ssh` only | never in the repo |
| Network | outbound internet (apt, Hugging Face download); **no inbound ports** except ssh; MySQL on localhost only | the box holds a clinical-style dump |
| Time zone / locale | same as the source box (read from the box: `timedatectl`, `locale`) | the harness and the faketime step depend on it |
| Lifetime | at least **5 days** from first login | rehearsal day 1-2, fixes and a re-run, then export and delete |

## Nice to have
- 4 vCPU and 32 GB RAM would make the operator's waiting shorter and would allow a second full chain (n = 2) the same day, which also tests the one unexplained hang of P20.
- A snapshot facility, so a failed rebuild can be rolled back instead of reinstalled.
- A different provider/region from the first box: the rehearsal then also shows the chain does not depend on that provider.

## Not needed
GPU, a public IP for services, a domain, any Khanza network features (BPJS bridging etc.), a second disk.

## Approximate cost
2 vCPU / 16 GB boxes of this class cost roughly a few USD per month on the common VPS providers (check the current price list: I did not look prices up). For a 5 to 7 day rental, hourly billing is cheapest.

## Alternatives, and what each proves
| Option | Proves | Does not prove |
|---|---|---|
| Another VPS, same spec (recommended) | a stranger can rebuild from repo + archives on a new machine | |
| Local VM (Hyper-V/VirtualBox) with the same Ubuntu | the same rebuild, no cloud cost | provider independence; the local disk must have 60 GB free (the C: drive has 38 GB free, so use another drive) |
| WSL2 Ubuntu | quick smoke test of the restore steps | `chattr` and systemd behave differently: not a faithful rehearsal |
| Docker | nothing useful here | `chattr +i` normally fails |

## What the owner decides
1. Which option and provider. 2. Who holds the ssh key. 3. When the box may be deleted afterwards (the archives stay on the local disk and on Hugging Face).

## Free offers checked on 2026-11-01 (from the providers' own pages; terms change, re-check before relying on them)
Source footprint measured on the current box: MySQL data 1.8 GB, Khanza tree 1.5 GB, `snapshots` 0.3 GB, mysqld RSS 7.8 GB with a 6 GB buffer pool (2 vCPU / 16 GB box).

| | Spec (above) | InstaBox free (`instabox.sh` docs: home, limits, pricing) | Oracle Always Free (`docs.oracle.com` FreeTier resourceref) |
|---|---|---|---|
| Type | full VM | Firecracker microVM (a VM, not a container); `systemd` and `sudo` work; `chattr` not addressed | A1: full VM (Arm); Micro: full VM (x86) |
| Arch | x86_64 | amd64 | **A1 is Arm (aarch64)**; Micro is x86 |
| OS | Ubuntu 24.04 | Debian 13 default; **Ubuntu 24.04 only from the `ci` template** | Ubuntu images available |
| vCPU | 2 (4 better) | **4** | A1: 2 OCPU total; Micro: 1/8 OCPU each |
| RAM | 16 GB (8 minimum) | **8 GiB** (= the minimum; pool must be ~3 GB, not 6 GB) | A1: 12 GB total; Micro: **1 GB** each |
| Disk | 60 GB free | 16 GiB root + 20 GiB `/data` (fixed, cannot be resized); 200 GiB stored incl. snapshots | boot volume min 47 GB, 200 GB total |
| Runtime | 5 days | **max run 480 min at a time, idle pause 30 min** (both fixed), 1 machine, 5 snapshots | idle instances may be reclaimed (7 days at <20%) |
| Network | outbound for apt/HF | downloads into the VM uncapped; outbound ~50 Mbit/s; 100 GiB egress/month | Micro up to 50 Mbps |
| Cost / sign-up | n/a | $0; sign-up requirements not stated on the pages; early accounts get 5 free sandboxes until 2026-12-01, then one | $0; account needs verification (card); the A1 allowance was halved in 2026 (2 OCPU / 12 GB) |

Assessment:
- **Oracle Micro (1 GB, 1/8 OCPU): unusable** (MySQL alone holds 1.8 GB of data; the harness needs a JVM and Xvfb).
- **Oracle A1 (Arm, 2 OCPU / 12 GB):** meets RAM and disk, fails the x86_64 requirement. A pass would show portability to Arm, but any difference could be the architecture, so it cannot be the primary rehearsal. Capacity ("out of host capacity") and the reclaim rule are extra risks. Possible later as a second experiment.
- **InstaBox free (4 vCPU / 8 GiB amd64):** below the spec on RAM (at the stated minimum) and on root disk, above it on CPU. Fits if MySQL's datadir goes on `/data` and the buffer pool is set to about 3 GB (data is 1.8 GB). The 480-min run cap covers the 67-min chain; the 30-min idle pause matters while waiting. **Open and decisive:** whether the microVM kernel accepts `chattr +i` and whether processes survive an idle pause; both are settled by a 5-minute probe (`uname -m`, `lsb_release -a`, `nproc`, `free -m`, `df -h`, `touch f; chattr +i f; lsattr f`, `apt-get install mysql-server-8.0 xvfb faketime openjdk-17-jdk` versions). A fail on `chattr` means InstaBox cannot host the rehearsal as designed (the frozen-file discipline is part of what is rehearsed).
- Nothing was signed up for or run. The owner signs up and logs in the CLI; the probe is then mine to run without handling a token.

