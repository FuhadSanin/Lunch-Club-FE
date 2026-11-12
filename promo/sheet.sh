#!/bin/bash
# usage: sheet.sh <dir> <out.png> <cols> frame frame ...  (contact sheet of frames)
d=$1; out=$2; cols=$3; shift 3
inputs=""; fc=""; n=0; labels=""
for f in "$@"; do inputs="$inputs -i $d/f$(printf %04d $f).png"; fc="$fc[$n]scale=640:-1[s$n];"; labels="$labels[s$n]"; n=$((n+1)); done
ffmpeg -loglevel error -y $inputs -filter_complex "${fc}${labels}xstack=inputs=$n:layout=$(python3 - "$n" "$cols" <<'PY'
import sys
n,c=int(sys.argv[1]),int(sys.argv[2])
print('|'.join(f"{(i%c)*640}_{(i//c)*360}" for i in range(n)))
PY
)" -frames:v 1 $out
