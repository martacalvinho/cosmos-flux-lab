# Complete ATOM/Cosmos Hub Pools from Astroport API

## Current Filtering Logic
The `AstroportService` filters for pools containing:
- `symbol.includes('atom')`
- `description.includes('atom')`
- `description.includes('cosmos hub')`
- `symbol === 'datom'`
- `symbol === 'statom'`

## All ATOM-Related Pools Found

### 1. **dATOM/USDC Pool** - $6.4M TVL
- **Pool Address**: `neutron1nfns3ck2ykrs0fknckrzd9728cyf77devuzernhwcwrdxw7ssk2s3tjf8r`
- **Assets**: dATOM (Drop Atom) / USDC
- **TVL**: $6,405,650
- **APY**: 0.54%
- **Volume**: $129,868/day

### 2. **NTRN/dATOM Pool** - $4.3M TVL
- **Pool Address**: `neutron1ke92yjl47eqy0mpgn9x4xups4szsm0ql6xhn4htw9zgn9wl5gm0quzh6ch`
- **Assets**: NTRN (Neutron) / dATOM (Drop Atom)
- **TVL**: $4,278,440
- **APY**: 0.85%
- **Volume**: $122,427/day

### 3. **ATOM/dATOM Pool** - $760K TVL
- **Pool Address**: `neutron1yem82r0wf837lfkwvcu2zxlyds5qrzwkz8alvmg0apyrjthk64gqeq2e98`
- **Assets**: ATOM (Cosmos Hub) / dATOM (Drop Atom)
- **TVL**: $760,022
- **APY**: 0.98%
- **Volume**: $38,256/day

### 4. **NTRN/ATOM Pool** - $408K TVL
- **Pool Address**: `neutron145z3nj7yqft2vpugr5a5p7jsnagvms90tvtej45g4s0xkqalhy7sj20vgz`
- **Assets**: NTRN (Neutron) / ATOM (Cosmos Hub)
- **TVL**: $407,878
- **APY**: 0.84%
- **Volume**: $19,174/day

### 5. **dNTRN/dATOM Pool** - $80K TVL
- **Pool Address**: `neutron1s2a5gwx8r2y8s5h80qdy4h6g0x7a7g8tdvqhy23v57pnsyptvaksayt4sl`
- **Assets**: dNTRN (Drop Neutron) / dATOM (Drop Atom)
- **TVL**: $80,329
- **APY**: 1.01%
- **Volume**: $1,114/day

### 6. **USDC/ATOM Pool** - $66K TVL
- **Pool Address**: `neutron1l48tsq2728tz0umh7l405t60h0wthtw908te9pfmcfgvku8cm2est9hq3j`
- **Assets**: USDC / ATOM (Cosmos Hub)
- **TVL**: $66,359
- **APY**: 23.58%
- **Volume**: $3,931/day

### 7. **dTIA/dATOM Pool** - $65K TVL
- **Pool Address**: `neutron1djs222dtwf3pw5h474fm68wc72ter5y4zftd36ugjs5e069hwqaq79pnrt`
- **Assets**: dTIA (Drop Celestia) / dATOM (Drop Atom)
- **TVL**: $64,965
- **APY**: 0.82%
- **Volume**: $1,804/day

### 8. **TIA/dATOM Pool** - $37K TVL
- **Pool Address**: `neutron1ncuu3mqc7kj6eh0hxgwe3x7v2lftehu63940lfkcag6ctdzjjg6qrhrng3`
- **Assets**: TIA (Celestia) / dATOM (Drop Atom)
- **TVL**: $36,698
- **APY**: 0%
- **Volume**: $0/day

### 9. **stATOM/dATOM Pool** - $25K TVL
- **Pool Address**: `neutron1fv65hlzjszz8zqsfh48kx2wdf9hp6xecrc2u2qpnmlcwt6mxa6tqhq8uvc`
- **Assets**: stATOM (Stride Atom) / dATOM (Drop Atom)
- **TVL**: $24,545
- **APY**: 0%
- **Volume**: $0/day

### 10. **amATOM/dATOM Pool** - $868 TVL
- **Pool Address**: `neutron14y0xyavpf5xznw56u3xml9f2jmx8ruk3y8f5e6zzkd9mhmcps3fs59g4vt`
- **Assets**: amATOM (Amulet) / dATOM (Drop Atom)
- **TVL**: $868
- **APY**: 0.00008%
- **Volume**: $13/day

## Additional Pools with ATOM Derivatives

### **ATOM/stkATOM Pool** - $4.1K TVL
- **Pool Address**: `neutron1d73vc84e36d4mmm9dwqql4saukv4tdjlclhdytaw`
- **Assets**: ATOM / stkATOM (PSTAKE)
- **TVL**: $4,099
- **APY**: 0%

### **ATOM/stATOM Stable Pool** - $104K TVL
- **Pool Address**: `neutron1gexnrw67sqje6y8taeehlmrl5nyw0tn9vtpq6tgxs62upsjhql5q2glanc`
- **Assets**: ATOM / stATOM (Stride Atom)
- **TVL**: $103,869
- **APY**: 0%

### **amATOM/stATOM Pool** - $471K TVL
- **Pool Address**: `neutron1w8vmg3zwyh62edp7uxpaw90447da9zzlv0kqh2ajye6a6mseg06qseyv5m`
- **Assets**: amATOM (Amulet) / stATOM (Stride Atom)
- **TVL**: $471,448
- **APY**: 1.80%

## Summary
- **Total Pools**: 13 ATOM-related pools
- **Total TVL**: ~$12.7M across all ATOM pools
- **Highest APY**: 23.58% (USDC/ATOM)
- **Largest Pool**: dATOM/USDC ($6.4M TVL)

## Current Implementation Gap
The current filtering logic captures most pools but may miss some edge cases. The implementation correctly identifies:
- Direct ATOM pools
- dATOM (Drop Atom) pools
- stATOM (Stride Atom) pools
- amATOM (Amulet) pools
- stkATOM (PSTAKE) pools
