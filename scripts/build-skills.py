#!/usr/bin/env python3
"""Build reproducible ZIPs from canonical skills without modifying their contents."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'dist' / 'skills'
DEST.mkdir(parents=True, exist_ok=True)
for skill in sorted((ROOT / 'skills').iterdir()):
    if not skill.is_dir() or not (skill / 'SKILL.md').is_file():
        continue
    output = DEST / f'{skill.name}.zip'
    with ZipFile(output, 'w', compression=ZIP_DEFLATED) as archive:
        for source in sorted(skill.rglob('*')):
            if source.is_symlink():
                raise ValueError(f'Unexpected symlink in canonical skill: {source}')
            if not source.is_file() or '__pycache__' in source.parts or source.suffix == '.pyc':
                continue
            member = ZipInfo(f'{skill.name}/{source.relative_to(skill).as_posix()}', (2020, 1, 1, 0, 0, 0))
            member.compress_type = ZIP_DEFLATED
            member.external_attr = (0o100644 << 16)
            archive.writestr(member, source.read_bytes())
    print(output.relative_to(ROOT))
