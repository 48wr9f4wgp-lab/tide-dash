from pathlib import Path
import hashlib, subprocess, json
base = subprocess.check_output(['git','show','7dc68393c0036ae626391ed299eb88d29c3e4725:app-candidate.js'])
assert hashlib.sha256(base).hexdigest() == '16307c7f3a9ba935937e98bd4275c2db315491531bc5beff92405b2ffcec9930'
addition = Path('scripts/field-ui-dev6.js').read_bytes()
assert hashlib.sha256(addition).hexdigest() == '034c468f8c9ad31563dce2cc66f92b7f89d68f4b3854313b5ee3fcc2d4fb1990'
repair = json.loads(Path('scripts/field-label-repair.json').read_text())
a = addition.decode('utf-8')
assert a.count(repair['old']) == 1
a = a.replace(repair['old'], repair['new'], 1)
assert hashlib.sha256(a.encode('utf-8')).hexdigest() == 'f0359c75f67d1f359ec2f02505ceeba6e16e4a646daea2d200249b228e9afb1c'
s = base.decode('utf-8').replace('const APP_VERSION="0.20.0-dev.5";','const APP_VERSION="0.20.0-dev.6";',1)
s = s.replace('function widget(t,wp,S,badge,badgeColor,err=null,distanceKm=null,locationState="current",tideRef=null){','function compactWidget(t,wp,S,badge,badgeColor,err=null,distanceKm=null,locationState="current",tideRef=null){',1)
i = s.index('async function buildCurrent(')
s = s[:i] + a + s[i:]
b = s.encode('utf-8')
assert len(b) == 74720
assert hashlib.sha256(b).hexdigest() == '650a16fcce889b9c3fba917c69e023b062fb4c8bf9043c52e0ff1410438dedd0'
assert hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest() == 'f5e7c6534a4220c0ab0622f60b593acc9724c5ed'
Path('app-candidate.js').write_bytes(b)
print('Exact tested artifact verified:', hashlib.sha256(b).hexdigest())
