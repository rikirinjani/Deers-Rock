# DR asset export 20261031T1630Z (UTC), state = after P22 (sizes and hashes only; no addresses, no credentials)

Built on the benchmark box under lock P23-CLAUDE-20261031 (13:11-16:3x local clock of the session, see evidence/cleanbox/). Excluded: benchmark_pw, any .env/.pem/_rsa, /opt/dr-benchmark/results/ (2.8 GB run outputs).
Includes (new vs the 10-23 export): all 42 P22 frozen tools and every .bak_* dir in Deers-Rock-tools.tar.gz, with Deers-Rock-tools.lsattr.txt (chattr state; tar does not carry it); P13-P22 run directories and logs under dr-benchmark.tar.gz (incl. the P15 oracle logs the 3z positive control reads).
Verified on the box: gzip -t, sik 1179 tables, sik_bench 23 tables, sik_bench restored into a scratch DB: 356355 ledger rows, pin 356355:a66a3a54... REPRODUCES-PIN, scratch dropped. The sik dump was not restored (table count only). Local copy re-verified by hash (evidence/cleanbox/a4_local_copy.txt).

```
b37d27580905fc4fcf75487406eef645f606772b4a92ab725356d5fff441af81  simrs-khanza.tar.gz
c0847d2027bf21859f1a361eeccf8c71a92b1449e54d1da748cf152fc8728275  dr-benchmark.tar.gz
0bc595c0d2196615b048b76ebeba97406e68ac7ccd67ab6935331ece0643822d  Deers-Rock-tools.tar.gz
60f0a22287857de6bf2f9d9895164aa3200e0a643c8857a0db8512ae78fbb47c  Deers-Rock-tools.lsattr.txt
f6312a475c0effa827a9d585262e63a81eebc784cca19834530a4d8001901acf  db/sik.sql.gz
c5acd984149fb5c5851234660990c993b23ff0984e9a6030526d530c341194b3  db/sik_bench.sql.gz
```

Stored: local disk (outside the repo). Cloud: pending the owner (Hugging Face private dataset, encrypted).
